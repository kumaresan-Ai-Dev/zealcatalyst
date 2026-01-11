import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, Video, DollarSign,
  Check, X, AlertCircle, ExternalLink, Copy, User
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { bookingsAPI } from '../services/api';
import type { BookingResponse } from '../services/api';

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await bookingsAPI.getMyBookings();
      setBookings(data);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setCancellingId(bookingId);
    try {
      const updated = await bookingsAPI.cancelBooking(bookingId);
      setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
      setMessage({ type: 'success', text: 'Booking cancelled successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to cancel booking' });
    } finally {
      setCancellingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Copied to clipboard!' });
    setTimeout(() => setMessage(null), 2000);
  };

  const now = new Date();
  const upcomingBookings = bookings
    .filter(b => b.status !== 'cancelled' && new Date(b.scheduled_at) >= now)
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  const pastBookings = bookings
    .filter(b => b.status === 'cancelled' || new Date(b.scheduled_at) < now)
    .sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-24 pb-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-600 mt-2">Manage your tutoring sessions</p>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{upcomingBookings.length}</div>
                <div className="text-sm text-gray-500">Upcoming</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-xl">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {bookings.filter(b => b.status === 'confirmed').length}
                </div>
                <div className="text-sm text-gray-500">Confirmed</div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {bookings.filter(b => b.status === 'pending').length}
                </div>
                <div className="text-sm text-gray-500">Pending</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
              activeTab === 'upcoming'
                ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Upcoming Sessions ({upcomingBookings.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
              activeTab === 'past'
                ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/25'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Past Sessions ({pastBookings.length})
          </button>
        </div>

        {/* Bookings List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {(activeTab === 'upcoming' ? upcomingBookings : pastBookings).length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 shadow-sm text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No {activeTab} sessions
              </h3>
              <p className="text-gray-500">
                {activeTab === 'upcoming'
                  ? 'Book a session with a tutor to get started!'
                  : 'Your completed sessions will appear here.'}
              </p>
            </div>
          ) : (
            (activeTab === 'upcoming' ? upcomingBookings : pastBookings).map(booking => (
              <div
                key={booking.id}
                className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                  booking.status === 'cancelled' ? 'border-red-200 opacity-75' :
                  booking.status === 'confirmed' ? 'border-green-200' :
                  'border-gray-100'
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {booking.tutor_name || 'Tutor'}
                        </h3>
                        <p className="text-gray-600">{booking.subject}</p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      booking.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span className="text-sm">
                        {new Date(booking.scheduled_at).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">
                        {new Date(booking.scheduled_at).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Video className="w-4 h-4" />
                      <span className="text-sm">{booking.session_type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-sm">${booking.price.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Meet Link for confirmed bookings */}
                  {booking.status === 'confirmed' && booking.meeting_link && (
                    <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
                      <div className="flex items-center gap-2 text-sm font-medium text-green-700 mb-2">
                        <Video className="w-4 h-4" />
                        Your session is confirmed! Join via Google Meet:
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={booking.meeting_link}
                          readOnly
                          className="flex-1 px-3 py-2 text-sm bg-white border border-green-200 rounded-lg"
                        />
                        <button
                          onClick={() => copyToClipboard(booking.meeting_link!)}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                          title="Copy link"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <a
                          href={booking.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Join Meet
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Pending status notice */}
                  {booking.status === 'pending' && (
                    <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                      <div className="flex items-center gap-2 text-sm text-yellow-700">
                        <Clock className="w-4 h-4" />
                        Waiting for tutor confirmation. You'll receive a Meet link once confirmed.
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {booking.notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600">
                        <strong>Notes:</strong> {booking.notes}
                      </p>
                    </div>
                  )}

                  {/* Cancel button for upcoming bookings */}
                  {activeTab === 'upcoming' && booking.status !== 'cancelled' && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        disabled={cancellingId === booking.id}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {cancellingId === booking.id ? (
                          <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
                        Cancel Booking
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default StudentDashboard;
