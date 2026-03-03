import React, { useState, useEffect } from 'react';
import { useAdmin } from '../contexts/AdminContext';
import { getAllUsers } from '../lib/auth';
import type { StoredUser } from '../lib/auth';

const AdminEmployees: React.FC = () => {
  const { searchQuery, setSearchQuery, openAddEmployeeModal } = useAdmin();
  const [employees, setEmployees] = useState<StoredUser[]>([]);

  useEffect(() => {
    getAllUsers().then((users) => setEmployees(users.filter((u) => u.role === 'ADMIN' || u.role === 'ENGINEER')));
  }, []);
  const matchesSearch = (text?: string) =>
    !searchQuery || (text || '').toLowerCase().includes(searchQuery.toLowerCase());
  const filteredEmployees = employees.filter(
    (e) => matchesSearch(e.name) || matchesSearch(e.email) || matchesSearch(e.id)
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-black text-[#F2C200] tracking-tight">Employees</h1>
        <div className="flex items-center gap-3">
          <div className="relative min-w-[200px] max-w-md">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
            <input
              type="text"
              placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#111111] border border-[#333333] rounded-full text-sm text-white focus:outline-none focus:border-[#F2C200]"
            />
          </div>
          <button
            onClick={openAddEmployeeModal}
            className="bg-[#F2C200] text-black px-5 py-2.5 rounded-xl font-bold flex items-center space-x-2 shadow-lg shadow-[#F2C2001A] hover:brightness-110 active:scale-95"
          >
            <i className="fas fa-user-plus"></i>
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      <div className="bg-[#111111] rounded-2xl border border-[#333333] overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-[#1A1A1A] border-b border-[#333333]">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#333333]">
            {filteredEmployees.map((emp) => (
              <tr key={emp.id} className="hover:bg-white/5">
                <td className="px-6 py-4">
                  <span className="text-[#F2C200] font-black tracking-widest text-xs uppercase">{emp.id}</span>
                </td>
                <td className="px-6 py-4 text-white font-bold">{emp.name}</td>
                <td className="px-6 py-4 text-gray-300">{emp.email}</td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#F2C200]/20 text-[#F2C200] text-[10px] font-black uppercase tracking-widest">
                    {emp.role === 'ENGINEER' ? 'Engineer' : emp.role === 'ADMIN' ? 'Admin' : emp.role}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredEmployees.length === 0 && (
          <div className="p-12 text-center text-gray-500 font-bold text-sm">
            No employees found. Add an employee to give them admin access.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEmployees;
