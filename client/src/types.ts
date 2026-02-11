
export type UserRole = 'GUEST' | 'ADMIN' | 'OWNER';

export interface User {
  id: string;
  email: string;
  password?: string; // Not needed for guest
  role: UserRole;
  restaurantIds: string[]; // Which restaurants this user can manage
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  DECLINED = 'DECLINED',
  OCCUPIED = 'OCCUPIED', // For walk-ins or manual assignment
  COMPLETED = 'COMPLETED'
}

export interface TableElement {
  id: string;
  type: 'table';
  x: number;
  y: number;
  seats: number;
  shape: 'circle' | 'square';
  label: string;
}

export interface DecoElement {
  id: string;
  type: 'wall' | 'bar' | 'plant';
  x: number;
  y: number;
  width: number;
  height: number;
}

export type LayoutElement = TableElement | DecoElement;

export interface Booking {
  id: string;
  restaurantId: string;
  tableId: string;
  tableLabel: string;
  dateTime: Date;
  status: BookingStatus;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  declineReason?: string;
  createdAt: Date;
}

export interface Restaurant {
  id: string;
  name: string;
  photoUrl?: string; // Mapped from photo_url
  address?: string;
  layout: LayoutElement[];
  bookings: Booking[];
}
