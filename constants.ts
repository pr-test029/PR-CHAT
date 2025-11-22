import { User, Contact } from './types';

export const CURRENT_USER: User = {
  id: 'me',
  name: 'You',
  avatar: 'https://picsum.photos/id/64/200/200',
  status: 'online',
  phoneNumber: '+1234567890'
};

export const AI_USER: User = {
  id: 'gemini_ai',
  name: 'Gemini AI',
  avatar: 'https://lh3.googleusercontent.com/UdUb2WzXQ763kKqC0wX8LgE8xXbN9gXf2xX8LgE8xXbN9gXf2xX8LgE8xXbN9gXf2xX8Lg=s200',
  status: 'online',
  isAi: true
};

export const DEMO_CONTACTS: Contact[] = [
  { id: 'c1', name: 'Alice Smith', phoneNumber: '+15550101', avatar: 'https://picsum.photos/id/1027/200/200' },
  { id: 'c2', name: 'Bob Jones', phoneNumber: '+15550102', avatar: 'https://picsum.photos/id/1012/200/200' },
];

export const DEMO_USERS: User[] = [
  { id: 'u1', name: 'Alice Smith', avatar: 'https://picsum.photos/id/1027/200/200', status: 'offline', phoneNumber: '+15550101' },
  { id: 'u2', name: 'Bob Jones', avatar: 'https://picsum.photos/id/1012/200/200', status: 'busy', phoneNumber: '+15550102' },
];