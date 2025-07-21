import React from 'react';
import './Skeleton.css';

export default function Skeleton({ width = '100%', height = 20 }) {
  return <div className="skeleton" style={{ width, height }}></div>;
}
