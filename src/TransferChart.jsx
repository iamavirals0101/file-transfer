import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale } from 'chart.js';
Chart.register(BarElement, CategoryScale, LinearScale);

export default function TransferChart({ history }) {
  const sent = history.filter(h => h.status === 'Delivered' && h.sender).length;
  const failed = history.filter(h => h.status !== 'Delivered').length;
  const received = history.filter(h => h.status === 'Delivered' && h.recipient).length;
  const data = {
    labels: ['Sent', 'Received', 'Failed'],
    datasets: [{
      label: 'Transfers',
      data: [sent, received, failed],
      backgroundColor: ['#1976d2', '#4caf50', '#f44336']
    }]
  };
  return <Bar data={data} options={{ plugins: { legend: { display: false } } }} />;
}
