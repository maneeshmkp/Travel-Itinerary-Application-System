// SearchBar.jsx
import { useState } from 'react';

const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = () => {
    if (searchTerm) {
      alert(`Searching for: ${searchTerm}`);
      // You can add your search logic here, like filtering data or calling an API.
    }
  };

  return (
    <div className="flex items-center justify-center p-4 max-w-lg mx-auto">
      <input
        type="text"
        className="w-4/5 p-2 text-lg border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-green-500"
        placeholder="Search destinations, itineraries..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <button
        onClick={handleSearch}
        className="p-2 bg-green-500 text-white rounded-r-lg hover:bg-green-600"
      >
        <i className="fas fa-search"></i> {/* Optional: Use a search icon */}
      </button>
    </div>
  );
};

export default SearchBar;
