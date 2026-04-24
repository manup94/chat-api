// Import necessary modules and mock dependencies
import request from 'supertest'; // Assuming supertest for API testing
import express from 'express';
import { prisma } from '../prisma/index'; // Or mock it
import { friendRoutes } from '../routes/friend.routes'; // Assuming routes are exported

// Mock Prisma client and authentication middleware
// This part would need to be adapted based on the actual testing setup
jest.mock('../prisma/index', () => ({
  prisma: {
    friendRequest: {
      findMany: jest.fn(),
    },
    user: { // Mock user for relations
      findUnique: jest.fn(),
    }
  },
}));

// Mock authentication middleware (assuming it adds user to req)
const mockAuthMiddleware = (req: any, res: any, next: any) => {
  req.user = { id: 'test-user-id', name: 'Test User' }; // Mock authenticated user
  next();
};

const app = express();
app.use(express.json());
// Apply mock authentication middleware before the routes
app.use((req, res, next) => mockAuthMiddleware(req, res, next));
app.use('/api', friendRoutes); // Assuming friendRoutes is the router for /api/friend-request etc.

describe('GET /api/friend-requests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should return pending friend requests with sender name', async () => {
    // Arrange: Mock Prisma response
    const mockSender = { id: 'sender-user-id', name: 'Alice' };
    const mockRequests = [
      {
        id: 'req-1',
        senderId: mockSender.id,
        receiverId: 'test-user-id',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: mockSender, // Mock the included sender object
      },
      {
        id: 'req-2',
        senderId: 'another-sender-id',
        receiverId: 'test-user-id',
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: { id: 'another-sender-id', name: 'Bob' },
      },
    ];

    (prisma.friendRequest.findMany as jest.Mock).mockResolvedValue(mockRequests);

    // Act: Make the request
    const response = await request(app)
      .get('/api/friend-requests')
      .set('Authorization', 'Bearer some-token'); // Auth header might be needed

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);

    // Assert senderName is present and correct
    expect(response.body[0].senderName).toBe('Alice');
    expect(response.body[1].senderName).toBe('Bob');

    // The controller maps results to include senderName, keeping original req properties and adding senderName.
    // The 'sender' object itself is also included as per Prisma's `include`.
    expect(response.body[0]).toHaveProperty('senderId', 'sender-user-id');
    expect(response.body[0]).toHaveProperty('senderName', 'Alice');
    expect(response.body[0]).toHaveProperty('sender');
    expect(response.body[0].sender).toHaveProperty('name', 'Alice');
    expect(response.body[0].sender).not.toHaveProperty('id'); // Only name was selected in Prisma

    expect(response.body[1]).toHaveProperty('senderId', 'another-sender-id');
    expect(response.body[1]).toHaveProperty('senderName', 'Bob');
    expect(response.body[1]).toHaveProperty('sender');
    expect(response.body[1].sender).toHaveProperty('name', 'Bob');
    expect(response.body[1].sender).not.toHaveProperty('id');

    // Verify that prisma.friendRequest.findMany was called correctly
    expect(prisma.friendRequest.findMany).toHaveBeenCalledWith({
      where: { receiverId: 'test-user-id', status: 'PENDING' },
      include: {
        sender: {
          select: {
            name: true,
          },
        },
      },
    });
  });

  it('should return an empty array if no pending friend requests are found', async () => {
    // Arrange: Mock Prisma response for no requests
    (prisma.friendRequest.findMany as jest.Mock).mockResolvedValue([]);

    // Act: Make the request
    const response = await request(app)
      .get('/api/friend-requests')
      .set('Authorization', 'Bearer some-token');

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  // Add more tests for error handling, different statuses, etc. if needed.
});
