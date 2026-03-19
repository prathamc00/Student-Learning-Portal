import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, Download, CheckCircle, XCircle, Trash2, Mail, ChevronLeft, ChevronRight, ShieldCheck, FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import { apiFetch, downloadBlob } from '../../utils/api';

interface UserRecord {
  _id: string;
  name: string;
  email: string;
  role: string;
  approvalStatus?: string;
  college?: string;
  branch?: string;
  semester?: number;
  phone?: string;
  createdAt: string;
  aadhaarCardPath?: string;
  aadhaarVerified?: boolean;
}

export default function ManageUsers() {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/users');
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUsers = users.length;
  const pendingInstructors = users.filter(u => u.role === 'instructor' && u.approvalStatus === 'pending').length;
  const activeStudents = users.filter(u => u.role === 'student').length;

  const handleApprove = async (id: string) => {
    try {
      await apiFetch(`/users/${id}/approval-status`, { method: 'PATCH', body: JSON.stringify({ approvalStatus: 'approved' }) });
      await loadUsers();
    } catch (err: any) { alert(err.message); }
  };

  const handleReject = async (id: string) => {
    try {
      await apiFetch(`/users/${id}/approval-status`, { method: 'PATCH', body: JSON.stringify({ approvalStatus: 'rejected' }) });
      await loadUsers();
    } catch (err: any) { alert(err.message); }
  };

  const handleVerifyAadhaar = async (id: string) => {
    try {
      await apiFetch(`/users/${id}/aadhaar-status`, { method: 'PATCH', body: JSON.stringify({ aadhaarVerified: true }) });
      await loadUsers();
    } catch (err: any) { alert(err.message); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    try {
      await apiFetch(`/users/${id}`, { method: 'DELETE' });
      await loadUsers();
    } catch (err: any) { alert(err.message); }
  };

  const handleExport = async () => {
    try {
      const blob = await apiFetch('/users/export');
      downloadBlob(blob, 'students_data.csv');
    } catch (err: any) { alert('Export failed: ' + err.message); }
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const getStatus = (u: UserRecord) => {
    if (u.role === 'instructor') {
      if (u.approvalStatus === 'approved') return 'Active';
      if (u.approvalStatus === 'rejected') return 'Rejected';
      return 'Pending';
    }
    return 'Active';
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">User Management</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Manage all students and instructors in one place.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-50 dark:bg-brand-900/20 rounded-2xl flex items-center justify-center text-brand-600 dark:text-brand-400"><Users className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Users</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{totalUsers}</h3>
            </div>
          </div>
        </div>
        <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400"><ShieldCheck className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pending Instructors</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{pendingInstructors}</h3>
            </div>
          </div>
        </div>
        <div className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-6 h-6" /></div>
            <div>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Students</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{activeStudents}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">User</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Aadhaar</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Joined Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">Loading users...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No users found</td></tr>
              ) : filteredUsers.map((user) => {
                const status = getStatus(user);
                return (
                  <tr key={user._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-400 font-bold border border-slate-200 dark:border-slate-700">
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{user.name}</p>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'instructor' ? 'bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400' 
                        : user.role === 'admin' ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                        : 'bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-bold ${
                        status === 'Active' ? 'text-emerald-600' : status === 'Pending' ? 'text-amber-600' : 'text-rose-500'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          status === 'Active' ? 'bg-emerald-600' : status === 'Pending' ? 'bg-amber-600' : 'bg-rose-500'
                        }`} />
                        {status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.aadhaarCardPath ? (
                        <div className="flex items-center gap-2">
                          <a href={`/${user.aadhaarCardPath}`} target="_blank" rel="noreferrer" className="p-2 bg-brand-50 text-brand-600 rounded-xl hover:bg-brand-100 dark:bg-brand-900/20 dark:text-brand-400 dark:hover:bg-brand-900/40 transition-colors" title="View Document">
                            <FileText className="w-4 h-4" />
                          </a>
                          {user.aadhaarVerified ? (
                            <ShieldCheck className="w-4 h-4 text-emerald-500" title="Verified" />
                          ) : (
                            <button onClick={() => handleVerifyAadhaar(user._id)} className="text-[10px] font-bold text-amber-500 hover:text-emerald-500 uppercase tracking-wider transition-colors">Verify</button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Not Uploaded</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-500 dark:text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.role === 'instructor' && user.approvalStatus === 'pending' && (
                          <>
                            <button onClick={() => handleApprove(user._id)} className="p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors" title="Approve">
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleReject(user._id)} className="p-2 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors" title="Reject">
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button onClick={() => handleDelete(user._id)} className="p-2 bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Showing {filteredUsers.length} of {totalUsers} users</p>
        </div>
      </div>
    </div>
  );
}
