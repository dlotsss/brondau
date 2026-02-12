import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useData } from '../context/DataContext';
import { UserRole } from '../types';

const LoginView: React.FC = () => {
  const { login } = useApp();
  const { getAdminRestaurants, getOwnerRestaurants } = useData();
  const navigate = useNavigate();

  const [loginType, setLoginType] = useState<UserRole>('GUEST');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [adminRestaurants, setAdminRestaurants] = useState<{ id: string, name: string }[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState('');
  const [showRestaurantSelect, setShowRestaurantSelect] = useState(false);

  useEffect(() => {
    setShowRestaurantSelect(false);
    setSelectedRestaurant('');
    setAdminRestaurants([]);
    setError('');
  }, [loginType, email]);

  const handleEmailCheck = async () => {
    if (!email) return;

    if (loginType === 'ADMIN') {
      const restaurants = await getAdminRestaurants(email);
      if (restaurants.length > 0) {
        setAdminRestaurants(restaurants);
        setShowRestaurantSelect(true);
        setSelectedRestaurant(restaurants[0].id);
      } else {
        setError('No restaurants found for this email');
      }
    } else if (loginType === 'OWNER') {
      const restaurants = await getOwnerRestaurants(email);
      if (restaurants.length > 0) {
        setAdminRestaurants(restaurants); // Reusing the state for simplicity
        setShowRestaurantSelect(true);
        setSelectedRestaurant(restaurants[0].id);
      } else {
        setError('No ownership found for this email');
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if ((loginType === 'ADMIN' || loginType === 'OWNER') && !selectedRestaurant) {
      setError('Please select a restaurant');
      return;
    }

    const user = await login(loginType, email, password, selectedRestaurant);
    if (user) {
      if (user.role === 'ADMIN' || user.role === 'OWNER') {
        if (user.restaurantIds.length === 1) {
          navigate(`/restaurant/${user.restaurantIds[0]}`);
        } else {
          navigate('/');
        }
      } else {
        navigate('/');
      }
    } else {
      setError('Invalid credentials. Please try again.');
    }
  };

  const handleGuestLogin = async () => {
    const success = await login('GUEST');
    if (success) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen bg-brand-secondary flex items-center justify-center p-4">
      <div className="bg-brand-accent p-8 rounded-lg shadow-lg max-w-md w-full border border-gray-700">
        <h1 className="text-3xl font-bold text-white text-center mb-2">Welcome</h1>
        <p className="text-gray-400 text-center mb-6">Please select your role to continue</p>

        <div className="flex gap-2 mb-6 rounded-md bg-brand-primary p-1">
          {(['GUEST', 'ADMIN', 'OWNER'] as UserRole[]).map(role => (
            <button
              key={role}
              onClick={() => setLoginType(role)}
              className={`w-full py-2 text-sm font-semibold rounded-md transition-colors ${loginType === role
                ? 'bg-brand-blue text-white shadow'
                : 'text-gray-300 hover:bg-brand-secondary'
                }`}
            >
              {role.charAt(0) + role.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {loginType === 'GUEST' ? (
          <button
            onClick={handleGuestLogin}
            className="w-full bg-brand-blue hover:bg-blue-600 text-white font-semibold py-3 rounded-md transition"
          >
            Enter as Guest
          </button>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <div className="bg-brand-red/20 text-brand-red p-3 rounded-md text-sm">{error}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailCheck}
                className="w-full bg-brand-primary p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                required
              />
            </div>

            {(loginType === 'ADMIN' || loginType === 'OWNER') && showRestaurantSelect && adminRestaurants.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Select Restaurant</label>
                <select
                  value={selectedRestaurant}
                  onChange={(e) => setSelectedRestaurant(e.target.value)}
                  className="w-full bg-brand-primary p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-blue appearance-none"
                  required
                >
                  {adminRestaurants.map(restaurant => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-brand-primary p-3 rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-brand-blue hover:bg-blue-600 text-white font-semibold py-3 rounded-md transition"
            >
              Login as {loginType.charAt(0) + loginType.slice(1).toLowerCase()}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginView;