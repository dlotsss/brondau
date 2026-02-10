import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { LayoutElement, Booking, BookingStatus, Restaurant, User, UserRole } from '../types';

const API_BASE_URL = 'http://localhost:3001/api';

interface DataContextType {
  restaurants: Restaurant[];
  getRestaurant: (id: string) => Restaurant | undefined;
  authenticateUser: (email: string, pass: string, role: UserRole, restaurantId?: string) => Promise<User | undefined>;
  getAdminRestaurants: (email: string) => Promise<{id: string, name: string}[]>;
  addRestaurant: (name: string) => Promise<Restaurant | null>;
  addBooking: (restaurantId: string, bookingData: Omit<Booking, 'id' | 'restaurantId'| 'tableLabel' | 'status' | 'createdAt' | 'declineReason'>) => Promise<void>;
  updateBookingStatus: (restaurantId: string, bookingId: string, status: BookingStatus, reason?: string) => Promise<void>;
  updateLayout: (restaurantId: string, newLayout: LayoutElement[]) => Promise<void>;
  loadRestaurants: () => Promise<void>;
  loadRestaurantBookings: (restaurantId: string) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  const loadRestaurants = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/restaurants`);
      const data = await response.json();

      const restaurantsWithBookings = await Promise.all(
        data.map(async (restaurant: any) => {
          const bookingsResponse = await fetch(`${API_BASE_URL}/restaurants/${restaurant.id}/bookings`);
          const bookings = await bookingsResponse.json();

          return {
            id: restaurant.id,
            name: restaurant.name,
            layout: restaurant.layout || [],
            bookings: bookings.map((b: any) => ({
              ...b,
              dateTime: new Date(b.date_time),
              createdAt: new Date(b.created_at)
            }))
          };
        })
      );

      setRestaurants(restaurantsWithBookings);
    } catch (error) {
      console.error('Failed to load restaurants:', error);
    }
  }, []);
  
  const loadRestaurantBookings = useCallback(async (restaurantId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/restaurants/${restaurantId}/bookings`);
      const bookings = await response.json();

      setRestaurants(prev => prev.map(r =>
        r.id === restaurantId
          ? {
              ...r,
              bookings: bookings.map((b: any) => ({
                ...b,
                dateTime: new Date(b.date_time),
                createdAt: new Date(b.created_at)
              }))
            }
          : r
      ));
    } catch (error) {
      console.error('Failed to load bookings:', error);
    }
  }, []);

  const getAdminRestaurants = useCallback(async (email: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/admin/restaurants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!response.ok) return [];

      return await response.json();
    } catch (error) {
      console.error('Failed to get admin restaurants:', error);
      return [];
    }
  }, []);

  const authenticateUser = useCallback(async (
    email: string,
    password: string,
    role: UserRole,
    restaurantId?: string
  ): Promise<User | undefined> => {
    try {
      const endpoint = role === 'OWNER' ? '/auth/owner' : '/auth/admin';
      const body = role === 'ADMIN'
        ? { email, password, restaurantId }
        : { email, password };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!response.ok) return undefined;

      const userData = await response.json();
      
      const finalUser: User = {
        id: userData.id,
        email: userData.email,
        // FIX: Cast the 'role' from the API response to the UserRole type to prevent type mismatch errors.
        role: userData.role as UserRole,
        restaurantIds: userData.restaurantId ? [userData.restaurantId] : []
      };
      
      if (finalUser.role === 'OWNER') {
        const res = await fetch(`${API_BASE_URL}/restaurants`);
        if(res.ok) {
            const allRestaurants: Restaurant[] = await res.json();
            finalUser.restaurantIds = allRestaurants.map(r => r.id);
        }
      }

      return finalUser;
    } catch (error) {
      console.error('Authentication failed:', error);
      return undefined;
    }
  }, []);

  const getRestaurant = useCallback((id: string) => {
    return restaurants.find(r => r.id === id);
  }, [restaurants]);

  const addRestaurant = useCallback(async (name: string): Promise<Restaurant | null> => {
    try {
        const response = await fetch(`${API_BASE_URL}/restaurants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        if (!response.ok) return null;

        const newRestaurant = await response.json();
        const restaurant: Restaurant = {
          id: newRestaurant.id,
          name: newRestaurant.name,
          layout: newRestaurant.layout || [],
          bookings: []
        };

        setRestaurants(prev => [...prev, restaurant]);
        return restaurant;
    } catch (error) {
        console.error('Failed to add restaurant', error);
        return null;
    }
  }, []);

  const updateLayout = useCallback(async (restaurantId: string, newLayout: LayoutElement[]) => {
    await fetch(`${API_BASE_URL}/restaurants/${restaurantId}/layout`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout: newLayout })
    });

    setRestaurants(prev => prev.map(r =>
      r.id === restaurantId ? { ...r, layout: newLayout } : r
    ));
  }, []);

  const addBooking = useCallback(async (
    restaurantId: string,
    bookingData: Omit<Booking, 'id' | 'restaurantId' | 'tableLabel' | 'status' | 'createdAt' | 'declineReason'>
  ) => {
    const tableLabel = restaurants.find(r => r.id === restaurantId)
        ?.layout.find(el => el.id === bookingData.tableId && el.type === 'table')
        // @ts-ignore
        ?.label || '';

    const response = await fetch(`${API_BASE_URL}/restaurants/${restaurantId}/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...bookingData,
        tableLabel,
      })
    });

    const newBooking = await response.json();

    setRestaurants(prev => prev.map(r =>
      r.id === restaurantId
        ? {
            ...r,
            bookings: [...r.bookings, {
              ...newBooking,
              dateTime: new Date(newBooking.date_time),
              createdAt: new Date(newBooking.created_at)
            }]
          }
        : r
    ));
  }, [restaurants]);

  const updateBookingStatus = useCallback(async (
    restaurantId: string,
    bookingId: string,
    status: BookingStatus,
    reason?: string
  ) => {
    await fetch(`${API_BASE_URL}/bookings/${bookingId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, declineReason: reason })
    });

    setRestaurants(prev => prev.map(r => {
      if (r.id === restaurantId) {
        return {
          ...r,
          bookings: r.bookings.map(b =>
            b.id === bookingId
              ? { ...b, status, declineReason: status === BookingStatus.DECLINED ? reason : undefined }
              : b
          )
        };
      }
      return r;
    }));
  }, []);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  useEffect(() => {
    const interval = setInterval(async () => {
      await fetch(`${API_BASE_URL}/bookings/cleanup-expired`, { method: 'POST' });

      for (const r of restaurants) {
        await loadRestaurantBookings(r.id);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [restaurants, loadRestaurantBookings]);

  return (
    <DataContext.Provider value={{
      restaurants,
      getRestaurant,
      authenticateUser,
      getAdminRestaurants,
      addRestaurant,
      addBooking,
      updateBookingStatus,
      updateLayout,
      loadRestaurants,
      loadRestaurantBookings
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
