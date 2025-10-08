import React, { useState } from 'react';
import './home.css';

export default function Browse(){
  const [query, setQuery] = useState('');

  function handleApply(e){
    e.preventDefault();
    // Hook this up to real search later
    alert('Search applied: ' + query);
  }

  return (
    <main className="container" style={{padding:0,width:'100%'}}>
      <h2 style={{margin:'0 0 12px'}}>Browse items</h2>
      <form onSubmit={handleApply} className="browse-hero">
        <div className="search-row">
          <input
            type="text"
            className="search-input-lg"
            placeholder="Search items (e.g., backpack, calculator, wallet)"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button className="btn search-apply" type="submit">Apply</button>
        </div>
      </form>
    </main>
  )
}

