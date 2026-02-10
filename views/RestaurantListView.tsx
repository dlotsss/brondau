
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useData } from '../context/DataContext';
import { Restaurant } from '../types';

const RestaurantCard: React.FC<{ restaurant: Restaurant; onSelect: () => void }> = ({ restaurant, onSelect }) => (
    <div 
        onClick={onSelect}
        className="bg-brand-primary p-6 rounded-lg shadow-lg cursor-pointer transition-all duration-300 hover:shadow-2xl hover:bg-brand-accent hover:scale-105"
    >
        <h3 className="text-xl font-bold text-white">{restaurant.name}</h3>
        <p className="text-gray-400 text-sm mt-1">{restaurant.layout.filter(l => l.type === 'table').length} tables</p>
    </div>
);

const AddRestaurantCard: React.FC<{ onAdd: (name: string) => void }> = ({ onAdd }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [name, setName] = useState('');

    const handleAdd = () => {
        if (name.trim()) {
            onAdd(name.trim());
            setIsAdding(false);
            setName('');
        }
    };

    if (isAdding) {
        return (
             <div className="bg-brand-primary p-6 rounded-lg shadow-lg border-2 border-dashed border-brand-accent">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="New Restaurant Name"
                    className="w-full bg-brand-secondary p-2 rounded-md mb-3"
                    autoFocus
                />
                <div className="flex space-x-2">
                    <button onClick={handleAdd} className="w-full bg-brand-blue p-2 rounded-md text-sm font-semibold">Save</button>
                    <button onClick={() => setIsAdding(false)} className="w-full bg-brand-accent p-2 rounded-md text-sm">Cancel</button>
                </div>
            </div>
        );
    }
    
    return (
        <div 
            onClick={() => setIsAdding(true)}
            className="bg-brand-primary p-6 rounded-lg shadow-lg cursor-pointer transition-all duration-300 hover:shadow-2xl hover:bg-brand-accent hover:scale-105 border-2 border-dashed border-brand-accent flex items-center justify-center text-gray-400 min-h-[116px]"
        >
            <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                <h3 className="font-bold">Add New Restaurant</h3>
            </div>
        </div>
    );
};


const RestaurantListView: React.FC = () => {
    const { currentUser, addRestaurantToCurrentUser } = useApp();
    const { restaurants, addRestaurant } = useData();
    const navigate = useNavigate();

    const handleAddRestaurant = async (name: string) => {
        const newRestaurant = await addRestaurant(name);
        if (newRestaurant) {
            addRestaurantToCurrentUser(newRestaurant.id);
        }
    }

    const managedRestaurants = currentUser?.role === 'GUEST' 
        ? restaurants 
        : restaurants.filter(r => currentUser?.restaurantIds.includes(r.id));
    
    return (
        <div className="min-h-screen bg-brand-secondary p-8 animate-fade-in">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold text-white mb-2">Select a Restaurant</h1>
                <p className="text-gray-400 mb-8">
                    {currentUser?.role === 'GUEST' ? "Choose a restaurant to view its floor plan and make a booking." : "Choose a restaurant to manage."}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {managedRestaurants.map(r => (
                        <RestaurantCard key={r.id} restaurant={r} onSelect={() => navigate(`/restaurant/${r.id}`)} />
                    ))}
                    {currentUser?.role === 'OWNER' && <AddRestaurantCard onAdd={handleAddRestaurant} />}
                </div>
            </div>
             <style>{`
                @keyframes fade-in {
                    0% { opacity: 0; transform: translateY(10px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
            `}</style>
        </div>
    );
};

export default RestaurantListView;
