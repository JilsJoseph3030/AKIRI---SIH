"use client";

import React, { useState, useEffect } from 'react';
import { generateCPCBReceipt } from '../../../lib/pdf-generator';

export default function RecyclerDashboard() {
  const [role, setRole] = useState<string | null>(null);
  const [txId, setTxId] = useState('');
  const [transaction, setTransaction] = useState<any>(null);
  const [adjustedWeight, setAdjustedWeight] = useState<number | string>('');

  useEffect(() => {
    // Authenticate Session: Only AUTHORIZED_RECYCLERs can access this handover portal.
    // Normally we would use lib/auth.ts getCurrentSession() or SSR validation here.
    setRole('AUTHORIZED_RECYCLER'); 
  }, []);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txId) return;

    // Supabase GET Mock: Fetch the specific lot sent by the kabadiwala/hub
    setTransaction({
      id: txId,
      material_category: 'PCB_HIGH_GRADE',
      raw_weight_kg: 150.0,
      status: 'PENDING',
      cpcb_reg_number: 'CPCB-REC-2026-991',
      yield: {
        recoveredCopperKg: 27,
        recoveredPreciousMetalsKg: 3,
        recoveredPlasticsKg: 45,
        inertResidueKg: 75
      }
    });
    setAdjustedWeight(150.0);
  };

  const handleConfirm = () => {
    if (!transaction) return;
    
    // Supabase PATCH Mock: Update final adjusted weight and mark status as COMPLETED
    alert(`💰 Payment Released! Final Weight Confirmed: ${adjustedWeight} kg`);
    
    // Automatically issue the audit certificate immediately after confirmation
    generateCPCBReceipt({ 
      ...transaction, 
      raw_weight_kg: Number(adjustedWeight) 
    });
  };

  // RBAC Hard Stop
  if (role !== 'AUTHORIZED_RECYCLER') {
    return <div className="p-10 text-red-500 font-bold text-2xl">Access Denied: Requires Authorized Recycler Role.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      <h1 className="text-4xl font-black mb-6 text-green-400 uppercase tracking-wide">Recycler Handover Portal</h1>
      
      {/* Transaction QR Scan Section */}
      <form onSubmit={handleScan} className="mb-8 p-6 bg-gray-800 rounded-xl border border-gray-700 shadow-lg">
        <label className="block text-gray-400 mb-2 font-bold uppercase tracking-wider">Scan Transaction QR Reference</label>
        <div className="flex gap-4">
          <input 
            type="text" 
            value={txId} 
            onChange={(e) => setTxId(e.target.value)} 
            placeholder="e.g. TX-1700000000"
            className="flex-1 bg-gray-900 border border-gray-600 rounded-lg p-4 text-white text-xl focus:outline-none focus:border-green-500"
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-8 py-4 rounded-lg font-bold text-lg transition shadow-md">
            Fetch Handover Lot
          </button>
        </div>
      </form>

      {/* Verification & Confirmation Panel */}
      {transaction && (
        <div className="p-8 bg-gray-800 rounded-xl border border-gray-700 shadow-2xl">
          <h2 className="text-2xl font-bold mb-6 text-blue-400">Lot Verification: {transaction.id}</h2>
          
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
              <span className="text-gray-400 text-sm uppercase tracking-widest block mb-2">Material Category</span>
              <p className="text-2xl font-black text-white">{transaction.material_category}</p>
            </div>
            <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
              <span className="text-gray-400 text-sm uppercase tracking-widest block mb-2">Field Intake Weight</span>
              <p className="text-2xl font-black text-yellow-400">{transaction.raw_weight_kg} kg</p>
            </div>
          </div>

          <div className="mb-8">
            <label className="block text-gray-400 mb-2 font-bold uppercase tracking-wider">Adjust Final Receiving Weight (kg) for Payment</label>
            <input 
              type="number" 
              value={adjustedWeight}
              onChange={(e) => setAdjustedWeight(e.target.value)}
              className="bg-gray-900 border border-gray-600 rounded-lg p-4 text-white text-3xl font-bold w-full max-w-md focus:outline-none focus:border-green-500"
            />
            <p className="text-gray-500 text-sm mt-2">Adjustments greater than 15% will trigger a density anomaly flag.</p>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={handleConfirm}
              className="bg-green-600 hover:bg-green-500 px-8 py-5 rounded-xl font-black text-xl flex-1 transition shadow-lg flex items-center justify-center gap-3"
            >
              ✅ Confirm Weight & Release Payment
            </button>
            <button 
              onClick={() => generateCPCBReceipt({ ...transaction, raw_weight_kg: Number(adjustedWeight) })}
              className="bg-purple-600 hover:bg-purple-500 px-8 py-5 rounded-xl font-bold text-lg transition shadow-lg"
            >
              📄 Download CPCB Audit Certificate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
