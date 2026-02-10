
import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Booking, BookingStatus, TableElement } from '../types';
import { useApp } from '../context/AppContext';

const CountdownTimer: React.FC<{ createdAt: Date }> = ({ createdAt }) => {
    const [timeLeft, setTimeLeft] = useState(180);

    useEffect(() => {
        const updateTimer = () => {
            const elapsed = (new Date().getTime() - createdAt.getTime()) / 1000;
            const remaining = 180 - elapsed;
            setTimeLeft(Math.max(0, remaining));
        };
        updateTimer();
        const intervalId = setInterval(updateTimer, 1000);
        return () => clearInterval(intervalId);
    }, [createdAt]);
    
    const minutes = Math.floor(timeLeft / 60);
    const seconds = Math.floor(timeLeft % 60);
    const timeColor = timeLeft < 60 ? 'text-brand-red' : 'text-brand-yellow';

    return <span className={`font-mono font-bold ${timeColor}`}>{minutes}:{seconds.toString().padStart(2, '0')}</span>;
};


const BookingRequestCard: React.FC<{ booking: Booking; restaurantId: string }> = ({ booking, restaurantId }) => {
    const { updateBookingStatus } = useData();
    const [reason, setReason] = useState('');
    const [isDeclining, setIsDeclining] = useState(false);
    
    const handleDecline = () => {
        if (!reason.trim()) {
            alert("Please provide a reason for declining.");
            return;
        }
        updateBookingStatus(restaurantId, booking.id, BookingStatus.DECLINED, reason);
    };

    return (
        <div className="bg-brand-accent p-4 rounded-lg shadow-md transition-transform hover:scale-105">
            <div className="flex justify-between items-center">
                <h4 className="font-bold text-lg">Table {booking.tableLabel}</h4>
                <div className="text-sm">
                   Time Left: <CountdownTimer createdAt={booking.createdAt} />
                </div>
            </div>
            <p className="text-sm text-gray-300">{booking.guestName} ({booking.guestCount} guests)</p>
            <p className="text-sm text-gray-400">{booking.dateTime.toLocaleString()}</p>
            
            {isDeclining ? (
                 <div className="mt-4 space-y-2">
                    <input 
                        type="text" 
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Reason for declining"
                        className="w-full bg-brand-primary p-2 rounded-md border border-gray-600 text-sm"
                    />
                    <div className="flex space-x-2">
                        <button onClick={handleDecline} className="flex-1 bg-brand-red text-white px-3 py-1.5 text-sm rounded-md hover:bg-red-700">Confirm Decline</button>
                        <button onClick={() => setIsDeclining(false)} className="bg-gray-500 text-white px-3 py-1.5 text-sm rounded-md hover:bg-gray-600">Cancel</button>
                    </div>
                </div>
            ) : (
                <div className="mt-4 flex space-x-2">
                    <button onClick={() => updateBookingStatus(restaurantId, booking.id, BookingStatus.CONFIRMED)} className="flex-1 bg-brand-green text-white px-3 py-1.5 text-sm font-semibold rounded-md hover:bg-green-700 transition-colors">Confirm</button>
                    <button onClick={() => setIsDeclining(true)} className="flex-1 bg-brand-red text-white px-3 py-1.5 text-sm font-semibold rounded-md hover:bg-red-700 transition-colors">Decline</button>
                </div>
            )}
        </div>
    );
};

const AdminView: React.FC = () => {
    const { selectedRestaurantId } = useApp();
    const { getRestaurant } = useData();
    
    const restaurant = selectedRestaurantId ? getRestaurant(selectedRestaurantId) : null;

    const pendingBookings = useMemo(() => {
        if (!restaurant) return [];
        return restaurant.bookings
            .filter(b => b.status === BookingStatus.PENDING)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }, [restaurant]);

    if (!restaurant) {
        return <div className="text-center text-gray-400">Loading restaurant data...</div>;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <h2 className="text-2xl font-bold mb-4">New Booking Requests</h2>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {pendingBookings.length > 0 ? (
                        pendingBookings.map(b => <BookingRequestCard key={b.id} booking={b} restaurantId={restaurant.id} />)
                    ) : (
                        <p className="text-gray-400 text-center py-8">No pending requests.</p>
                    )}
                </div>
            </div>
            <div className="lg:col-span-2">
                 <h2 className="text-2xl font-bold mb-4">Live Floor Plan for {restaurant.name}</h2>
                <div className="w-full h-[500px] bg-brand-primary rounded-lg relative overflow-hidden border-2 border-brand-accent">
                    {restaurant.layout.map(el => {
                        if (el.type !== 'table') {
                             const styles: { [key: string]: string } = { wall: 'bg-gray-500', bar: 'bg-yellow-800', plant: 'bg-green-700 rounded-full' };
                             return <div key={el.id} style={{ left: `${el.x}px`, top: `${el.y}px`, width: `${(el as any).width}px`, height: `${(el as any).height}px` }} className={`absolute ${styles[el.type]}`} />
                        }
                        
                        const now = new Date();
                        const currentBooking = restaurant.bookings.find(b => b.tableId === el.id && (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.OCCUPIED) && b.dateTime <= now && new Date(b.dateTime.getTime() + 2*60*60*1000) > now);
                        const isPending = restaurant.bookings.some(b => b.tableId === el.id && b.status === BookingStatus.PENDING);
                        
                        let statusColor = 'bg-brand-green/80';
                        if (currentBooking) statusColor = 'bg-brand-red/80 cursor-not-allowed';
                        if (isPending) statusColor = 'bg-brand-yellow/80 cursor-wait';

                        const shapeClasses = el.shape === 'circle' ? 'rounded-full w-12 h-12' : 'rounded-md w-14 h-14';

                        return (
                            <div 
                                key={el.id} 
                                style={{ left: `${el.x}px`, top: `${el.y}px` }} 
                                className={`absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center font-bold text-white transition-colors ${shapeClasses} ${statusColor}`}
                            >
                                {el.label}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AdminView;
