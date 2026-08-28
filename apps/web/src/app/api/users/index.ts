import { User } from '@stream-share/db';
import { API } from '../constants';

export const getUser = async (userId: string) => {
  const response = await fetch(`${API}/users/${userId}`);

  if (!response.ok) {
    if (response.status === 404) return { data: null };
    throw new Error(`Failed to fetch user by id "${userId}": ${response.status}`);
  }

  return response.json() as Promise<{
    data: User;
  }>;
};
