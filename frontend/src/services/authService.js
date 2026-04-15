
import { BASE_URL } from './backendData';

const login = async (email, password) => {
  try {
    const response = await fetch(`${BASE_URL}/loginUser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    const json = await response.json();
    return json;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const createUser = async (email, name, password, inviteCode = '') => {
  try {
    const response = await fetch(`${BASE_URL}/createUser`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, name, password, invite_code: inviteCode }),
    });
    const json = await response.json();
    return json;
  } catch (error) {
    console.error(error);
    throw error;
  }
};

const authService = {
  login,
  createUser,
};

export default authService;
