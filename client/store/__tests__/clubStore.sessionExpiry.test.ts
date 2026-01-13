import { useClubStore } from '../clubStore';
import * as api from '../../services/api';

// Mock the api module
jest.mock('../../services/api', () => ({
  apiGetWithHeaders: jest.fn(),
  apiPostWithHeaders: jest.fn(),
}));

const mockApiGetWithHeaders = api.apiGetWithHeaders as jest.MockedFunction<typeof api.apiGetWithHeaders>;
const mockApiPostWithHeaders = api.apiPostWithHeaders as jest.MockedFunction<typeof api.apiPostWithHeaders>;

describe('clubStore session expiry handling', () => {
  beforeEach(() => {
    // Reset store state before each test
    useClubStore.setState({
      clubs: [],
      loading: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  describe('fetchMyClubs', () => {
    it('should set SESSION_EXPIRED error when token is invalid or expired', async () => {
      mockApiGetWithHeaders.mockResolvedValue({
        success: false,
        error: 'Invalid or expired token',
      });

      await useClubStore.getState().fetchMyClubs('old-token');

      expect(useClubStore.getState().error).toBe('SESSION_EXPIRED');
      expect(useClubStore.getState().loading).toBe(false);
    });

    it('should set SESSION_EXPIRED error when Authorization header is missing', async () => {
      mockApiGetWithHeaders.mockResolvedValue({
        success: false,
        error: 'Missing Authorization Bearer token',
      });

      await useClubStore.getState().fetchMyClubs('');

      expect(useClubStore.getState().error).toBe('SESSION_EXPIRED');
      expect(useClubStore.getState().loading).toBe(false);
    });

    it('should set SESSION_EXPIRED error when JWT exp claim is invalid', async () => {
      mockApiGetWithHeaders.mockResolvedValue({
        success: false,
        error: '"exp" claim timestamp check failed',
      });

      await useClubStore.getState().fetchMyClubs('expired-jwt');

      expect(useClubStore.getState().error).toBe('SESSION_EXPIRED');
      expect(useClubStore.getState().loading).toBe(false);
    });

    it('should set regular error for other API failures', async () => {
      mockApiGetWithHeaders.mockResolvedValue({
        success: false,
        error: 'Database connection failed',
      });

      await useClubStore.getState().fetchMyClubs('valid-token');

      expect(useClubStore.getState().error).toBe('Database connection failed');
      expect(useClubStore.getState().loading).toBe(false);
    });

    it('should load clubs successfully with valid token', async () => {
      const mockClubs = [
        { id: 'club-1', name: 'Test Club', ownerId: 'p1', memberIds: ['p1'], inviteCode: 'ABC123' },
      ];
      mockApiGetWithHeaders.mockResolvedValue({
        success: true,
        clubs: mockClubs,
        count: 1,
      });

      await useClubStore.getState().fetchMyClubs('valid-token');

      expect(useClubStore.getState().error).toBeNull();
      expect(useClubStore.getState().clubs).toEqual(mockClubs);
      expect(useClubStore.getState().loading).toBe(false);
    });

    it('should set loading state while fetching', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockApiGetWithHeaders.mockReturnValue(promise as Promise<any>);

      const fetchPromise = useClubStore.getState().fetchMyClubs('token');

      expect(useClubStore.getState().loading).toBe(true);

      resolvePromise!({ success: true, clubs: [], count: 0 });
      await fetchPromise;

      expect(useClubStore.getState().loading).toBe(false);
    });

    it('should handle network errors as SESSION_EXPIRED if they mention token', async () => {
      mockApiGetWithHeaders.mockRejectedValue(new Error('Invalid or expired token'));

      await useClubStore.getState().fetchMyClubs('bad-token');

      expect(useClubStore.getState().error).toBe('SESSION_EXPIRED');
    });

    it('should handle generic network errors normally', async () => {
      mockApiGetWithHeaders.mockRejectedValue(new Error('Network request failed'));

      await useClubStore.getState().fetchMyClubs('token');

      expect(useClubStore.getState().error).toBe('Network request failed');
    });
  });

  describe('createClub', () => {
    it('should set error on failure', async () => {
      mockApiPostWithHeaders.mockResolvedValue({
        success: false,
        error: 'Club name already exists',
      });

      const result = await useClubStore.getState().createClub('token', 'My Club');

      expect(result).toBeNull();
      expect(useClubStore.getState().error).toBe('Club name already exists');
    });

    it('should add club to list on success', async () => {
      const newClub = {
        id: 'club-new',
        name: 'New Club',
        ownerId: 'p1',
        memberIds: ['p1'],
        inviteCode: 'NEW123',
      };
      mockApiPostWithHeaders.mockResolvedValue({
        success: true,
        club: newClub,
      });

      const result = await useClubStore.getState().createClub('token', 'New Club');

      expect(result).toEqual(newClub);
      expect(useClubStore.getState().clubs).toContainEqual(newClub);
      expect(useClubStore.getState().error).toBeNull();
    });
  });

  describe('joinClub', () => {
    it('should set error when invite code is invalid', async () => {
      mockApiPostWithHeaders.mockResolvedValue({
        success: false,
        error: 'Invalid invite code',
      });

      const result = await useClubStore.getState().joinClub('token', 'BADCODE');

      expect(result).toBeNull();
      expect(useClubStore.getState().error).toBe('Invalid invite code');
    });

    it('should add club to list on successful join', async () => {
      const joinedClub = {
        id: 'club-joined',
        name: 'Joined Club',
        ownerId: 'p2',
        memberIds: ['p2', 'p1'],
        inviteCode: 'JOIN99',
      };
      mockApiPostWithHeaders.mockResolvedValue({
        success: true,
        club: joinedClub,
      });

      const result = await useClubStore.getState().joinClub('token', 'JOIN99');

      expect(result).toEqual(joinedClub);
      expect(useClubStore.getState().clubs).toContainEqual(joinedClub);
    });
  });

  describe('fetchClub', () => {
    it('should update existing club in list', async () => {
      // Set up initial state with a club
      useClubStore.setState({
        clubs: [{ id: 'club-1', name: 'Old Name', ownerId: 'p1', memberIds: ['p1'], inviteCode: 'ABC' }],
        loading: false,
        error: null,
      });

      const updatedClub = {
        id: 'club-1',
        name: 'Updated Name',
        ownerId: 'p1',
        memberIds: ['p1', 'p2'],
        inviteCode: 'ABC',
      };
      mockApiGetWithHeaders.mockResolvedValue({
        success: true,
        club: updatedClub,
      });

      const result = await useClubStore.getState().fetchClub('token', 'club-1');

      expect(result).toEqual(updatedClub);
      expect(useClubStore.getState().clubs).toHaveLength(1);
      expect(useClubStore.getState().clubs[0].name).toBe('Updated Name');
    });

    it('should return null on error', async () => {
      mockApiGetWithHeaders.mockResolvedValue({
        success: false,
        error: 'Club not found',
      });

      const result = await useClubStore.getState().fetchClub('token', 'nonexistent');

      expect(result).toBeNull();
      expect(useClubStore.getState().error).toBe('Club not found');
    });
  });
});
