
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { LayoutElement, TableElement, BookingStatus, DecoElement } from '../types';
import BookingModal from '../components/BookingModal';
import { useApp } from '../context/AppContext';

const Table: React.FC<{ table: TableElement; status: string; onClick: () => void }> = ({ table, status, onClick }) => {
    const statusClasses: { [key: string]: string } = {
        available: 'bg-brand-green/70 hover:bg-brand-green cursor-pointer ring-brand-green',
        confirmed: 'bg-brand-red/70 cursor-not-allowed ring-brand-red',
        pending: 'bg-brand-yellow/70 cursor-not-allowed ring-brand-yellow',
    };

    const baseClasses = "absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center font-bold text-white transition-all duration-300 hover:scale-110 focus:ring-4";
    const shapeClasses = table.shape === 'circle' ? 'rounded-full w-12 h-12' : 'rounded-md w-14 h-14';

    return (
        <div
            style={{ left: `${table.x}px`, top: `${table.y}px` }}
            className={`${baseClasses} ${shapeClasses} ${statusClasses[status]}`}
            onClick={status === 'available' ? onClick : undefined}
            tabIndex={status === 'available' ? 0 : -1}
        >
            <span>{table.label}</span>
        </div>
    );
};


const Deco: React.FC<{ element: DecoElement }> = ({ element }) => {
    const styles: { [key: string]: string } = {
        wall: 'bg-gray-500',
        bar: 'bg-yellow-800 border-2 border-yellow-900',
        plant: 'bg-green-700 rounded-full',
    };

    return (
        <div
            style={{ 
                left: `${element.x}px`, top: `${element.y}px`, 
                width: `${element.width}px`, 
                height: `${element.height}px`
            }}
            className={`absolute ${styles[element.type]}`}
        />
    );
}

const UserView: React.FC = () => {
    const { selectedRestaurantId } = useApp();
    const { getRestaurant } = useData();
    const [selectedTable, setSelectedTable] = useState<TableElement | null>(null);

    const restaurant = selectedRestaurantId ? getRestaurant(selectedRestaurantId) : null;

    const tableStatuses = useMemo(() => {
        if (!restaurant) return {};
        const statuses: { [key: string]: string } = {};
        const now = new Date();
        const tables = restaurant.layout.filter(el => el.type === 'table') as TableElement[];

        tables.forEach(table => {
            const activePending = restaurant.bookings
                .filter(b => b.tableId === table.id && b.status === BookingStatus.PENDING && b.dateTime <= now)
                .sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime())[0];

            const activeConfirmed = restaurant.bookings
                .filter(
                    b =>
                        b.tableId === table.id &&
                        (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.OCCUPIED) &&
                        b.dateTime <= now
                )
                .sort((a, b) => b.dateTime.getTime() - a.dateTime.getTime())[0];

            if (activePending) {
                statuses[table.id] = 'pending';
            } else if (activeConfirmed) {
                statuses[table.id] = 'confirmed';
            } else {
                statuses[table.id] = 'available';
            }
        });
        return statuses;
    }, [restaurant]);

    if (!restaurant) {
        return <div className="text-center text-gray-400">Loading restaurant data...</div>;
    }

    return (
        <div className="bg-brand-primary p-6 rounded-lg shadow-xl">
            <h2 className="text-3xl font-bold mb-2 text-white">Welcome to {restaurant.name}!</h2>
            <p className="text-gray-400 mb-6">Click on an available green table to make a reservation.</p>

            <div className="w-full h-[500px] bg-brand-secondary rounded-lg relative overflow-hidden border-2 border-brand-accent">
                {restaurant.layout.map(element => 
                    element.type === 'table' 
                        ? <Table key={element.id} table={element as TableElement} status={tableStatuses[element.id] || 'available'} onClick={() => setSelectedTable(element as TableElement)} />
                        : <Deco key={element.id} element={element as DecoElement} />
                )}
            </div>
             <div className="flex justify-center space-x-6 mt-4">
                <div className="flex items-center"><div className="w-4 h-4 rounded-full bg-brand-green mr-2"></div><span>Available</span></div>
                <div className="flex items-center"><div className="w-4 h-4 rounded-full bg-brand-yellow mr-2"></div><span>Pending</span></div>
                <div className="flex items-center"><div className="w-4 h-4 rounded-full bg-brand-red mr-2"></div><span>Booked</span></div>
            </div>

            {selectedTable && selectedRestaurantId && <BookingModal table={selectedTable} restaurantId={selectedRestaurantId} onClose={() => setSelectedTable(null)} />}
        </div>
    );
};

export default UserView;
