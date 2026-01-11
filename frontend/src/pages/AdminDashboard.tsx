import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, GraduationCap, Briefcase, Calendar,
  DollarSign, TrendingUp, Search, Filter,
  Check, X, AlertCircle, Trash2, Eye, Ban,
  CheckCircle, Clock, UserCheck, BarChart3,
  Wallet, UserPlus, Percent, ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../services/api';
import type { DashboardStats, AdminUser, AdminTutor, AdminBooking, RevenueStats, PaymentRecord } from '../services/api';

type TabType = 'overview' | 'users' | 'tutors' | 'bookings' | 'revenue';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Data states
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tutors, setTutors] = useState<AdminTutor[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [revenueStats, setRevenueStats] = useState<RevenueStats | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);

  // Filter states
  const [userFilter, setUserFilter] = useState({ role: '', search: '' });
  const [tutorFilter, setTutorFilter] = useState({ verified: '', search: '' });
  const [bookingFilter, setBookingFilter] = useState({ status: '', search: '' });

  // Action loading
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }
    fetchData();
  }, [user, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsData, usersData, tutorsData, bookingsData, revenueData, paymentsData] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers(),
        adminAPI.getTutors(),
        adminAPI.getBookings(),
        adminAPI.getRevenueStats(),
        adminAPI.getPayments()
      ]);
      setStats(statsData);
      setUsers(usersData);
      setTutors(tutorsData);
      setBookings(bookingsData);
      setRevenueStats(revenueData);
      setPayments(paymentsData);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      setMessage({ type: 'error', text: 'Failed to load admin data' });
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // User Actions
  const handleToggleUserActive = async (userId: string, currentActive: boolean) => {
    setActionLoading(userId);
    try {
      await adminAPI.updateUser(userId, { is_active: !currentActive });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentActive } : u));
      showMessage('success', `User ${currentActive ? 'deactivated' : 'activated'} successfully`);
    } catch {
      showMessage('error', 'Failed to update user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    setActionLoading(userId);
    try {
      await adminAPI.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      showMessage('success', 'User deleted successfully');
    } catch {
      showMessage('error', 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  // Tutor Actions
  const handleVerifyTutor = async (tutorId: string) => {
    setActionLoading(tutorId);
    try {
      await adminAPI.verifyTutor(tutorId);
      setTutors(prev => prev.map(t => t.id === tutorId ? { ...t, is_verified: true } : t));
      showMessage('success', 'Tutor verified successfully');
    } catch {
      showMessage('error', 'Failed to verify tutor');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleTutorActive = async (tutorId: string, currentActive: boolean) => {
    setActionLoading(tutorId);
    try {
      if (currentActive) {
        await adminAPI.suspendTutor(tutorId);
      } else {
        await adminAPI.activateTutor(tutorId);
      }
      setTutors(prev => prev.map(t => t.id === tutorId ? { ...t, is_active: !currentActive } : t));
      showMessage('success', `Tutor ${currentActive ? 'suspended' : 'activated'} successfully`);
    } catch {
      showMessage('error', 'Failed to update tutor');
    } finally {
      setActionLoading(null);
    }
  };

  // Booking Actions
  const handleUpdateBookingStatus = async (bookingId: string, status: string) => {
    setActionLoading(bookingId);
    try {
      await adminAPI.updateBookingStatus(bookingId, status);
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b));
      showMessage('success', `Booking status updated to ${status}`);
    } catch {
      showMessage('error', 'Failed to update booking');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to delete this booking?')) return;
    setActionLoading(bookingId);
    try {
      await adminAPI.deleteBooking(bookingId);
      setBookings(prev => prev.filter(b => b.id !== bookingId));
      showMessage('success', 'Booking deleted successfully');
    } catch {
      showMessage('error', 'Failed to delete booking');
    } finally {
      setActionLoading(null);
    }
  };

  // Filtered data
  const filteredUsers = users.filter(u => {
    if (userFilter.role && u.role !== userFilter.role) return false;
    if (userFilter.search) {
      const search = userFilter.search.toLowerCase();
      if (!u.full_name.toLowerCase().includes(search) && !u.email.toLowerCase().includes(search)) return false;
    }
    return true;
  });

  const filteredTutors = tutors.filter(t => {
    if (tutorFilter.verified === 'verified' && !t.is_verified) return false;
    if (tutorFilter.verified === 'pending' && t.is_verified) return false;
    if (tutorFilter.search) {
      const search = tutorFilter.search.toLowerCase();
      if (!t.full_name.toLowerCase().includes(search) && !t.email.toLowerCase().includes(search)) return false;
    }
    return true;
  });

  const filteredBookings = bookings.filter(b => {
    if (bookingFilter.status && b.status !== bookingFilter.status) return false;
    if (bookingFilter.search) {
      const search = bookingFilter.search.toLowerCase();
      if (!b.student_name.toLowerCase().includes(search) && !b.tutor_name.toLowerCase().includes(search)) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Manage users, tutors, and bookings</p>
        </motion.div>

        {/* Message Toast */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-24 right-4 z-50 px-6 py-4 rounded-xl shadow-lg ${
                message.type === 'success' ? 'bg-green-500' : 'bg-red-500'
              } text-white flex items-center gap-2`}
            >
              {message.type === 'success' ? <Check className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'tutors', label: 'Tutors', icon: GraduationCap },
            { id: 'bookings', label: 'Bookings', icon: Calendar },
            { id: 'revenue', label: 'Revenue', icon: Wallet },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && stats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{stats.total_users}</div>
                    <div className="text-sm text-gray-500">Total Users</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <GraduationCap className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{stats.total_students}</div>
                    <div className="text-sm text-gray-500">Students</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <Briefcase className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{stats.total_tutors}</div>
                    <div className="text-sm text-gray-500">Tutors</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <Calendar className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">{stats.total_bookings}</div>
                    <div className="text-sm text-gray-500">Total Bookings</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue & Bookings Stats */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Revenue
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">Total Revenue</span>
                    <span className="text-2xl font-bold text-green-600">${stats.revenue_total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">This Month</span>
                    <span className="text-xl font-bold text-green-600">${stats.revenue_this_month.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  This Week
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">New Users</span>
                    <span className="text-2xl font-bold text-blue-600">{stats.new_users_this_week}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">New Bookings</span>
                    <span className="text-xl font-bold text-blue-600">{stats.new_bookings_this_week}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Status Breakdown */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Booking Status Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-yellow-50 rounded-xl text-center">
                  <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-yellow-700">{stats.pending_bookings}</div>
                  <div className="text-sm text-yellow-600">Pending</div>
                </div>
                <div className="p-4 bg-green-50 rounded-xl text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-green-700">{stats.confirmed_bookings}</div>
                  <div className="text-sm text-green-600">Confirmed</div>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl text-center">
                  <Check className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-blue-700">{stats.completed_bookings}</div>
                  <div className="text-sm text-blue-600">Completed</div>
                </div>
                <div className="p-4 bg-red-50 rounded-xl text-center">
                  <X className="w-8 h-8 text-red-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-red-700">{stats.cancelled_bookings}</div>
                  <div className="text-sm text-red-600">Cancelled</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={userFilter.search}
                  onChange={(e) => setUserFilter({ ...userFilter, search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={userFilter.role}
                  onChange={(e) => setUserFilter({ ...userFilter, role: e.target.value })}
                  className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Roles</option>
                  <option value="student">Students</option>
                  <option value="tutor">Tutors</option>
                  <option value="admin">Admins</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">User</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Role</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Joined</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{u.full_name}</div>
                          <div className="text-sm text-gray-500">{u.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          u.role === 'tutor' ? 'bg-orange-100 text-orange-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleToggleUserActive(u.id, u.is_active)}
                            disabled={actionLoading === u.id}
                            className={`p-2 rounded-lg transition-colors ${
                              u.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={u.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {u.is_active ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            disabled={actionLoading === u.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="p-12 text-center text-gray-500">No users found</div>
              )}
            </div>
          </motion.div>
        )}

        {/* Tutors Tab */}
        {activeTab === 'tutors' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search tutors..."
                  value={tutorFilter.search}
                  onChange={(e) => setTutorFilter({ ...tutorFilter, search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={tutorFilter.verified}
                  onChange={(e) => setTutorFilter({ ...tutorFilter, verified: e.target.value })}
                  className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Tutors</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending Verification</option>
                </select>
              </div>
            </div>

            {/* Tutors Table */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tutor</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Subjects</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Rate</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Sessions</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTutors.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{t.full_name}</div>
                          <div className="text-sm text-gray-500">{t.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {t.subjects.slice(0, 2).map(s => (
                            <span key={s} className="px-2 py-1 text-xs bg-gray-100 rounded-full">{s}</span>
                          ))}
                          {t.subjects.length > 2 && (
                            <span className="px-2 py-1 text-xs bg-gray-100 rounded-full">+{t.subjects.length - 2}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 font-medium">${t.hourly_rate}/hr</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`px-3 py-1 text-xs font-medium rounded-full inline-block w-fit ${
                            t.is_verified ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {t.is_verified ? 'Verified' : 'Pending'}
                          </span>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full inline-block w-fit ${
                            t.is_active ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {t.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{t.total_sessions}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {!t.is_verified && (
                            <button
                              onClick={() => handleVerifyTutor(t.id)}
                              disabled={actionLoading === t.id}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Verify"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleTutorActive(t.id, t.is_active)}
                            disabled={actionLoading === t.id}
                            className={`p-2 rounded-lg transition-colors ${
                              t.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={t.is_active ? 'Suspend' : 'Activate'}
                          >
                            {t.is_active ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredTutors.length === 0 && (
                <div className="p-12 text-center text-gray-500">No tutors found</div>
              )}
            </div>
          </motion.div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Filters */}
            <div className="bg-white rounded-2xl p-4 shadow-sm mb-6 flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by student or tutor..."
                  value={bookingFilter.search}
                  onChange={(e) => setBookingFilter({ ...bookingFilter, search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={bookingFilter.status}
                  onChange={(e) => setBookingFilter({ ...bookingFilter, status: e.target.value })}
                  className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Student</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tutor</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Subject</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Price</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredBookings.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{b.student_name}</div>
                          <div className="text-sm text-gray-500">{b.student_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{b.tutor_name}</div>
                          <div className="text-sm text-gray-500">{b.tutor_email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{b.subject}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(b.scheduled_at).toLocaleDateString()}<br />
                        {new Date(b.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 font-medium">${b.price.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <select
                          value={b.status}
                          onChange={(e) => handleUpdateBookingStatus(b.id, e.target.value)}
                          disabled={actionLoading === b.id}
                          className={`px-3 py-1 text-xs font-medium rounded-full border-0 cursor-pointer ${
                            b.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                            b.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            b.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-700'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="confirmed">Confirmed</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {b.meeting_link && (
                            <a
                              href={b.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Meet"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => handleDeleteBooking(b.id)}
                            disabled={actionLoading === b.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredBookings.length === 0 && (
                <div className="p-12 text-center text-gray-500">No bookings found</div>
              )}
            </div>
          </motion.div>
        )}

        {/* Revenue Tab */}
        {activeTab === 'revenue' && revenueStats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Platform Fee Info */}
            <div className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-2xl p-6 text-white">
              <h3 className="text-xl font-bold mb-4">Platform Fee Structure</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Percent className="w-6 h-6" />
                    <span className="font-semibold">Session Commission</span>
                  </div>
                  <div className="text-3xl font-bold">{revenueStats.commission_rate}%</div>
                  <p className="text-white/70 text-sm mt-1">Applied to every session booking</p>
                </div>
                <div className="bg-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <UserPlus className="w-6 h-6" />
                    <span className="font-semibold">Admission Fee</span>
                  </div>
                  <div className="text-3xl font-bold">{revenueStats.admission_rate}%</div>
                  <p className="text-white/70 text-sm mt-1">One-time fee for new students</p>
                </div>
              </div>
            </div>

            {/* Revenue Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">${revenueStats.total_revenue.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">Total Platform Revenue</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Percent className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">${revenueStats.total_commission_fees.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">Commission Fees (5%)</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <UserPlus className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">${revenueStats.total_admission_fees.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">Admission Fees (10%)</div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 rounded-xl">
                    <ArrowUpRight className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">${revenueStats.total_tutor_payouts.toFixed(2)}</div>
                    <div className="text-sm text-gray-500">Tutor Payouts</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly & Weekly Stats */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary-600" />
                  This Month
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">Revenue</span>
                    <span className="text-xl font-bold text-green-600">${revenueStats.monthly_revenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">Commission</span>
                    <span className="font-bold text-blue-600">${revenueStats.monthly_commission_fees.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">Admission</span>
                    <span className="font-bold text-purple-600">${revenueStats.monthly_admission_fees.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">Bookings</span>
                    <span className="font-bold text-gray-900">{revenueStats.monthly_bookings}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Summary
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">Total Payments</span>
                    <span className="text-xl font-bold text-gray-900">{revenueStats.total_payments}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">New Students</span>
                    <span className="font-bold text-purple-600">{revenueStats.total_new_students}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">Weekly Revenue</span>
                    <span className="font-bold text-green-600">${revenueStats.weekly_revenue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <span className="text-gray-600">Weekly Bookings</span>
                    <span className="font-bold text-gray-900">{revenueStats.weekly_bookings}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Payments Table */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">Recent Payments</h3>
              </div>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Student</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Tutor</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Session</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Commission</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Admission</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Platform Fee</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payments.slice(0, 10).map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{p.student_name}</div>
                        {p.is_first_booking && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">New</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{p.tutor_name}</td>
                      <td className="px-6 py-4 font-medium">${p.session_amount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-blue-600">${p.commission_fee.toFixed(2)}</td>
                      <td className="px-6 py-4 text-purple-600">
                        {p.admission_fee > 0 ? `$${p.admission_fee.toFixed(2)}` : '-'}
                      </td>
                      <td className="px-6 py-4 font-bold text-green-600">${p.total_platform_fee.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          p.status === 'completed' ? 'bg-green-100 text-green-700' :
                          p.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payments.length === 0 && (
                <div className="p-12 text-center text-gray-500">No payments yet</div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
