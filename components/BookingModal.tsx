
import React, { useState } from 'react';
import { BookingStatus, TableElement } from '../types';
import { useData } from '../context/DataContext';

const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface BookingModalProps {
    table: TableElement;
    restaurantId: string;
    onClose: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ table, restaurantId, onClose }) => {
    const { addBooking, getRestaurant } = useData();
    const [guestName, setGuestName] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    const [guestCount, setGuestCount] = useState<number>(2);
    const [bookingDate, setBookingDate] = useState(formatLocalDate(new Date()));
    const [bookingTime, setBookingTime] = useState('19:00');
    const [error, setError] = useState('');

    const existingBookings = getRestaurant(restaurantId)
        ?.bookings
        .filter(booking =>
            booking.tableId === table.id &&
            (booking.status === BookingStatus.PENDING || booking.status === BookingStatus.CONFIRMED) &&
            booking.dateTime.getTime() >= Date.now()
        )
        .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime()) || [];

    const formatBookingSlot = (date: Date) =>
        new Intl.DateTimeFormat('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        }).format(date);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!guestName || !guestPhone) {
            setError('Please fill in your name and phone number.');
            return;
        }
        if (guestCount > table.seats) {
            setError(`This table only accommodates up to ${table.seats} guests.`);
            return;
        }
        setError('');

        const dateTime = new Date(`${bookingDate}T${bookingTime}`);
        try {
            await addBooking(restaurantId, {
                tableId: table.id,
                guestName,
                guestPhone,
                guestCount,
                dateTime
            });
            alert('Your booking request has been sent!');
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create booking. Please try again.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity duration-300">
            <div className="bg-brand-secondary rounded-lg shadow-2xl p-8 w-full max-w-md m-4 transform transition-all duration-300 scale-95 animate-fade-in-up">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Book Table <span className="text-brand-blue">{table.label}</span></h2>
                    <button onClick={onClose} className="text-gray-400 text-3xl leading-none hover:text-white transition-colors">&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <p className="text-gray-400 mb-6">For up to <span className="font-semibold text-white">{table.seats}</span> guests.</p>
                    
                    {error && <p className="bg-red-900 border border-brand-red text-red-300 px-4 py-2 rounded-md mb-4 text-sm">{error}</p>}

                    <div className="space-y-4">
                        <div className="bg-brand-accent/70 p-3 rounded-md border border-gray-700">
                            <p className="text-sm font-semibold text-white mb-2">Уже занятые слоты:</p>
                            {existingBookings.length > 0 ? (
                                <ul className="space-y-1 text-sm text-gray-200 max-h-28 overflow-y-auto pr-1">
                                    {existingBookings.map(booking => (
                                        <li key={booking.id} className="flex items-center justify-between">
                                            <span>{formatBookingSlot(booking.dateTime)}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${booking.status === BookingStatus.PENDING ? 'bg-brand-yellow/30 text-brand-yellow' : 'bg-brand-red/30 text-brand-red'}`}>
                                                {booking.status === BookingStatus.PENDING ? 'ожидает' : 'подтверждена'}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-400">На этот столик пока нет активных броней.</p>
                            )}
                        </div>
                        <input type="text" placeholder="Your Name" value={guestName} onChange={e => setGuestName(e.target.value)} className="w-full bg-brand-accent p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-blue" required />
                        <input type="tel" placeholder="Phone Number" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="w-full bg-brand-accent p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-blue" required />
                        <div className="flex items-center space-x-4">
                            <label className="text-gray-300">Guests:</label>
                            <input type="number" value={guestCount} onChange={e => setGuestCount(parseInt(e.target.value))} min="1" max={table.seats} className="w-20 bg-brand-accent p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-blue" />
                        </div>
                        <div className="flex space-x-4">
                            <input type="date" value={bookingDate} onChange={e => setBookingDate(e.target.value)} className="w-full bg-brand-accent p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-blue" />
                            <input type="time" value={bookingTime} onChange={e => setBookingTime(e.target.value)} className="w-full bg-brand-accent p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-blue" />
                        </div>
                    </div>

                    <div className="mt-8 flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 rounded-md bg-brand-accent text-white hover:bg-gray-600 transition-colors">Cancel</button>
                        <button type="submit" className="px-6 py-2 rounded-md bg-brand-blue text-white font-semibold hover:bg-blue-600 transition-colors shadow-md">Request Booking</button>
                    </div>
                </form>
            </div>
            <style>{`
                @keyframes fade-in-up {
                    0% { opacity: 0; transform: translateY(20px) scale(0.95); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default BookingModal;
