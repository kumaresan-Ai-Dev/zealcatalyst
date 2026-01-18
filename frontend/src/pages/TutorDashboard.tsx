import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Calendar, Clock, DollarSign, BookOpen,
  MapPin, GraduationCap, Save, ChevronLeft, ChevronRight,
  Plus, X, Check, AlertCircle, Users, Video,
  Briefcase, Languages, Award, Link, Copy, ExternalLink,
  Wallet, TrendingUp, ArrowDownCircle, CreditCard, Building, Smartphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { tutorsAPI, availabilityAPI, bookingsAPI, withdrawalAPI } from '../services/api';
import type { TutorProfile } from '../types';
import type { AvailabilitySettings, WeeklySchedule, TimeSlot, CalendarDay, BlockedDate, BookingResponse, TutorStats, WithdrawalResponse } from '../services/api';

const DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const SUBJECTS_LIST = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
  'Computer Science', 'Data Science', 'Web Development', 'Python',
  'JavaScript', 'Machine Learning', 'Spanish', 'French', 'German',
  'IELTS', 'TOEFL', 'SAT Prep', 'UI/UX Design', 'Music', 'Art',
  'History', 'Geography', 'Economics', 'Accounting', 'Business Studies',
  'Psychology', 'Sociology', 'Political Science', 'Philosophy', 'Literature'
];

const LANGUAGES_LIST = ['English', 'Spanish', 'French', 'German', 'Mandarin', 'Hindi', 'Arabic', 'Portuguese', 'Japanese', 'Korean'];

const TutorDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'availability' | 'calendar' | 'earnings'>('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Profile state
  const [profile, setProfile] = useState<Partial<TutorProfile>>({
    headline: '',
    bio: '',
    experience_years: 0,
    education: '',
    hourly_rate: 0,
    group_hourly_rate: 0,
    languages: ['English'],
    subjects: [],
    country: '',
    city: '',
    offers_private: true,
    offers_group: false,
  });

  // Availability state
  const [, setAvailability] = useState<AvailabilitySettings | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>({
    monday: [], tuesday: [], wednesday: [], thursday: [],
    friday: [], saturday: [], sunday: []
  });

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');

  // Bookings state
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editingMeetLink, setEditingMeetLink] = useState<string | null>(null);
  const [meetLinkInput, setMeetLinkInput] = useState('');

  // Custom subject input state
  const [customSubjectInput, setCustomSubjectInput] = useState('');

  // Earnings & Withdrawal state
  const [tutorStats, setTutorStats] = useState<TutorStats | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalResponse[]>([]);
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bank_transfer' | 'upi' | 'paypal'>('bank_transfer');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'calendar') {
      fetchCalendar();
    }
    if (activeTab === 'earnings') {
      fetchEarnings();
    }
  }, [currentMonth, activeTab]);

  const fetchEarnings = async () => {
    try {
      const [statsData, withdrawalsData] = await Promise.all([
        withdrawalAPI.getStats(),
        withdrawalAPI.getMyWithdrawals()
      ]);
      setTutorStats(statsData);
      setWithdrawals(withdrawalsData);
    } catch (error) {
      console.error('Failed to fetch earnings:', error);
    }
  };

  const handleWithdrawalRequest = async () => {
    const amount = parseFloat(withdrawalAmount);
    if (!amount || amount <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid amount' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (!paymentDetails.trim()) {
      setMessage({ type: 'error', text: 'Please enter payment details' });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    if (tutorStats && amount > tutorStats.available_balance) {
      setMessage({ type: 'error', text: `Insufficient balance. Available: ${tutorStats.currency} ${tutorStats.available_balance.toFixed(2)}` });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setWithdrawalLoading(true);
    try {
      await withdrawalAPI.requestWithdrawal({
        amount,
        payment_method: paymentMethod,
        payment_details: paymentDetails.trim()
      });
      setMessage({ type: 'success', text: 'Withdrawal request submitted successfully!' });
      setTimeout(() => setMessage(null), 3000);
      setWithdrawalAmount('');
      setPaymentDetails('');
      fetchEarnings();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Failed to submit withdrawal request' });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setWithdrawalLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [profileData, availabilityData, blockedData, bookingsData] = await Promise.all([
        tutorsAPI.getMyProfile().catch(() => null),
        availabilityAPI.getSettings().catch(() => null),
        availabilityAPI.getBlockedDates().catch(() => ({ blocked_dates: [] })),
        bookingsAPI.getTutorBookings().catch(() => [])
      ]);

      if (profileData) {
        setProfile(profileData);
      }

      if (availabilityData) {
        setAvailability(availabilityData);
        setWeeklySchedule(availabilityData.weekly_schedule);
      }

      setBlockedDates(blockedData.blocked_dates);
      setBookings(bookingsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get bookings for a specific date
  const getBookingsForDate = (dateStr: string): BookingResponse[] => {
    return bookings.filter(b => b.scheduled_at.split('T')[0] === dateStr);
  };

  // Check if a date has bookings
  const hasBookings = (dateStr: string): boolean => {
    return getBookingsForDate(dateStr).length > 0;
  };

  const fetchCalendar = async () => {
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const data = await availabilityAPI.getCalendar(year, month);
      setCalendarDays(data.days);
    } catch (error) {
      console.error('Failed to fetch calendar:', error);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await tutorsAPI.updateProfile(profile);
      setMessage({ type: 'success', text: 'Profile saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAvailability = async () => {
    setSaving(true);
    try {
      await availabilityAPI.updateSchedule(weeklySchedule);
      setMessage({ type: 'success', text: 'Availability saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
      fetchCalendar();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save availability' });
    } finally {
      setSaving(false);
    }
  };

  const addTimeSlot = (day: keyof WeeklySchedule) => {
    const newSlot: TimeSlot = { start_time: '09:00', end_time: '17:00' };
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: [...prev[day], newSlot]
    }));
  };

  const removeTimeSlot = (day: keyof WeeklySchedule, index: number) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== index)
    }));
  };

  const updateTimeSlot = (day: keyof WeeklySchedule, index: number, field: 'start_time' | 'end_time', value: string) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [day]: prev[day].map((slot, i) => i === index ? { ...slot, [field]: value } : slot)
    }));
  };

  const handleBlockDate = async () => {
    if (!selectedDate) return;
    try {
      const newBlocked = await availabilityAPI.addBlockedDate(selectedDate, blockReason);
      setBlockedDates(prev => [...prev, newBlocked]);
      setSelectedDate(null);
      setBlockReason('');
      fetchCalendar();
      setMessage({ type: 'success', text: 'Date blocked successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to block date' });
    }
  };

  const handleUnblockDate = async (dateId: string) => {
    try {
      await availabilityAPI.removeBlockedDate(dateId);
      setBlockedDates(prev => prev.filter(d => d.id !== dateId));
      fetchCalendar();
      setMessage({ type: 'success', text: 'Date unblocked!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to unblock date' });
    }
  };

  // Booking actions
  const handleConfirmBooking = async (bookingId: string) => {
    setActionLoading(bookingId);
    try {
      const updated = await bookingsAPI.confirmBooking(bookingId);
      setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
      setMessage({ type: 'success', text: 'Booking confirmed! Meet link has been generated.' });
      setTimeout(() => setMessage(null), 4000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to confirm booking' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    setActionLoading(bookingId);
    try {
      const updated = await bookingsAPI.cancelBooking(bookingId);
      setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
      setMessage({ type: 'success', text: 'Booking cancelled' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to cancel booking' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpdateMeetLink = async (bookingId: string) => {
    if (!meetLinkInput.trim()) return;
    setActionLoading(bookingId);
    try {
      const updated = await bookingsAPI.updateMeetLink(bookingId, meetLinkInput.trim());
      setBookings(prev => prev.map(b => b.id === bookingId ? updated : b));
      setEditingMeetLink(null);
      setMeetLinkInput('');
      setMessage({ type: 'success', text: 'Meet link updated!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update Meet link' });
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage({ type: 'success', text: 'Copied to clipboard!' });
    setTimeout(() => setMessage(null), 2000);
  };

  const toggleSubject = (subject: string) => {
    setProfile(prev => ({
      ...prev,
      subjects: prev.subjects?.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...(prev.subjects || []), subject]
    }));
  };

  const addCustomSubject = () => {
    const trimmed = customSubjectInput.trim();
    if (trimmed && !profile.subjects?.includes(trimmed)) {
      setProfile(prev => ({
        ...prev,
        subjects: [...(prev.subjects || []), trimmed]
      }));
      setCustomSubjectInput('');
    }
  };

  const removeSubject = (subject: string) => {
    setProfile(prev => ({
      ...prev,
      subjects: prev.subjects?.filter(s => s !== subject) || []
    }));
  };

  const handleSubjectKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomSubject();
    }
  };

  const toggleLanguage = (lang: string) => {
    setProfile(prev => ({
      ...prev,
      languages: prev.languages?.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...(prev.languages || []), lang]
    }));
  };

  // Calendar navigation
  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));

  // Check if a date is a weekend (Saturday or Sunday)
  const isWeekend = (dateStr: string): boolean => {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
  };

  // Get calendar grid
  const getCalendarGrid = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; // Adjust for Monday start

    const grid: (CalendarDay | null)[] = [];

    // Empty cells before first day
    for (let i = 0; i < adjustedFirstDay; i++) {
      grid.push(null);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const calDay = calendarDays.find(d => d.date === dateStr);
      grid.push(calDay || { date: dateStr, is_available: false, is_blocked: false, slots_count: 0 });
    }

    return grid;
  };

  // Get day styling based on availability, bookings and weekend status
  const getDayStyle = (day: CalendarDay) => {
    const weekend = isWeekend(day.date);
    const today = new Date().toISOString().split('T')[0];
    const isPast = day.date < today;
    const dayHasBookings = hasBookings(day.date);

    if (day.is_blocked) {
      // Explicitly blocked - darker red
      return 'bg-red-200 text-red-800 border-2 border-red-300';
    }
    if (dayHasBookings) {
      // Has bookings - blue
      return 'bg-blue-100 text-blue-700 border-2 border-blue-300 hover:bg-blue-200 cursor-pointer';
    }
    if (weekend) {
      // Weekend (default holiday) - lighter rose/red
      return 'bg-rose-50 text-rose-600 border border-rose-200';
    }
    if (day.is_available && day.slots_count > 0) {
      // Available with slots - green
      return `bg-emerald-100 text-emerald-700 border border-emerald-200 ${!isPast ? 'hover:bg-emerald-200 hover:border-emerald-300 cursor-pointer' : ''}`;
    }
    if (isPast) {
      return 'bg-gray-50 text-gray-300 border border-gray-100';
    }
    // No availability set
    return 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200 cursor-pointer';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.full_name?.split(' ')[0]}!
          </h1>
          <p className="text-gray-600 mt-2">Manage your profile, availability, and schedule</p>
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
        <div className="flex gap-2 mb-8 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
          {[
            { id: 'profile', label: 'Profile Setup', icon: User },
            { id: 'availability', label: 'Weekly Schedule', icon: Clock },
            { id: 'calendar', label: 'Calendar', icon: Calendar },
            { id: 'earnings', label: 'Earnings', icon: Wallet },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/25'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="grid lg:grid-cols-3 gap-8"
          >
            {/* Main Profile Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Info Card */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary-600" />
                  Professional Information
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Professional Headline</label>
                    <input
                      type="text"
                      value={profile.headline || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, headline: e.target.value }))}
                      placeholder="e.g., Expert Mathematics Tutor | PhD in Applied Mathematics"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                    <textarea
                      value={profile.bio || ''}
                      onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell students about yourself, your teaching style, and what makes you unique..."
                      rows={4}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <GraduationCap className="w-4 h-4 inline mr-1" />
                        Education
                      </label>
                      <input
                        type="text"
                        value={profile.education || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, education: e.target.value }))}
                        placeholder="e.g., PhD in Mathematics"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Award className="w-4 h-4 inline mr-1" />
                        Years of Experience
                      </label>
                      <input
                        type="number"
                        value={profile.experience_years || 0}
                        onChange={(e) => setProfile(prev => ({ ...prev, experience_years: parseInt(e.target.value) || 0 }))}
                        min="0"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Country
                      </label>
                      <input
                        type="text"
                        value={profile.country || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, country: e.target.value }))}
                        placeholder="e.g., United States"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <input
                        type="text"
                        value={profile.city || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="e.g., New York"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Card */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary-600" />
                  Pricing & Sessions
                </h2>

                {/* Session Types */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Session Types You Offer</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.offers_private}
                        onChange={(e) => setProfile(prev => ({ ...prev, offers_private: e.target.checked }))}
                        className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                      />
                      <Video className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">1-on-1 Sessions</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={profile.offers_group}
                        onChange={(e) => setProfile(prev => ({ ...prev, offers_group: e.target.checked }))}
                        className="w-5 h-5 rounded text-primary-600 focus:ring-primary-500"
                      />
                      <Users className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-medium">Group Sessions</span>
                    </label>
                  </div>
                </div>

                {/* Pricing Grid */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* 1-on-1 Rate */}
                  <div className={`p-4 rounded-xl border-2 transition-all ${profile.offers_private ? 'border-primary-200 bg-primary-50/50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Video className="w-5 h-5 text-primary-600" />
                      <label className="text-sm font-semibold text-gray-900">1-on-1 Session Rate</label>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                      <input
                        type="number"
                        value={profile.hourly_rate || 0}
                        onChange={(e) => setProfile(prev => ({ ...prev, hourly_rate: parseFloat(e.target.value) || 0 }))}
                        min="0"
                        disabled={!profile.offers_private}
                        placeholder="Enter rate per hour"
                        className="w-full pl-8 pr-16 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">/hour</span>
                    </div>
                  </div>

                  {/* Group Rate */}
                  <div className={`p-4 rounded-xl border-2 transition-all ${profile.offers_group ? 'border-secondary-200 bg-secondary-50/50' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-5 h-5 text-secondary-600" />
                      <label className="text-sm font-semibold text-gray-900">Group Session Rate</label>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">₹</span>
                      <input
                        type="number"
                        value={profile.group_hourly_rate || 0}
                        onChange={(e) => setProfile(prev => ({ ...prev, group_hourly_rate: parseFloat(e.target.value) || 0 }))}
                        min="0"
                        disabled={!profile.offers_group}
                        placeholder="Enter rate per hour"
                        className="w-full pl-8 pr-16 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">/hour</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Rate per student in group sessions</p>
                  </div>
                </div>
              </div>

              {/* Subjects Card */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary-600" />
                  Subjects You Teach
                </h2>

                {/* Selected Subjects Tags */}
                {profile.subjects && profile.subjects.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-600 mb-2">Your Selected Subjects</label>
                    <div className="flex flex-wrap gap-2">
                      {profile.subjects.map(subject => (
                        <span
                          key={subject}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-full text-sm font-medium"
                        >
                          {subject}
                          <button
                            onClick={() => removeSubject(subject)}
                            className="hover:bg-primary-700 rounded-full p-0.5 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Subject Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-600 mb-2">Add Custom Subject</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customSubjectInput}
                      onChange={(e) => setCustomSubjectInput(e.target.value)}
                      onKeyPress={handleSubjectKeyPress}
                      placeholder="Type a subject and press Enter..."
                      className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <button
                      onClick={addCustomSubject}
                      disabled={!customSubjectInput.trim()}
                      className="px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>

                {/* Suggested Subjects */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">Or select from suggestions</label>
                  <div className="flex flex-wrap gap-2">
                    {SUBJECTS_LIST.filter(s => !profile.subjects?.includes(s)).map(subject => (
                      <button
                        key={subject}
                        onClick={() => toggleSubject(subject)}
                        className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 bg-gray-100 text-gray-700 hover:bg-primary-100 hover:text-primary-700 border border-transparent hover:border-primary-200"
                      >
                        + {subject}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Languages Card */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Languages className="w-5 h-5 text-primary-600" />
                  Languages You Speak
                </h2>

                <div className="flex flex-wrap gap-2">
                  {LANGUAGES_LIST.map(lang => (
                    <button
                      key={lang}
                      onClick={() => toggleLanguage(lang)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ${
                        profile.languages?.includes(lang)
                          ? 'bg-secondary-600 text-white shadow-lg shadow-secondary-500/25'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-primary-600 transition-all duration-300 shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                Save Profile
              </button>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-primary-600 to-secondary-600 rounded-2xl p-6 text-white">
                <h3 className="text-lg font-bold mb-4">Profile Completion</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Headline', done: !!profile.headline },
                    { label: 'Bio', done: !!profile.bio },
                    { label: 'Education', done: !!profile.education },
                    { label: 'Hourly Rate', done: (profile.hourly_rate || 0) > 0 },
                    { label: 'Subjects', done: (profile.subjects?.length || 0) > 0 },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${item.done ? 'bg-green-400' : 'bg-white/20'}`}>
                        {item.done && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <span className={item.done ? 'opacity-100' : 'opacity-60'}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Tips</h3>
                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Add a professional photo to increase bookings by 40%
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Write a detailed bio highlighting your expertise
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    Set competitive rates based on your experience
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {/* Availability Tab */}
        {activeTab === 'availability' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-600" />
              Set Your Weekly Availability
            </h2>

            <p className="text-gray-600 mb-8">
              Define your regular working hours for each day of the week. Students will be able to book sessions during these time slots.
            </p>

            <div className="space-y-4">
              {DAYS_OF_WEEK.map((day, index) => (
                <div key={day} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-20 font-semibold text-gray-900 pt-2 capitalize">
                    {DAY_LABELS[index]}
                  </div>

                  <div className="flex-1 space-y-2">
                    {weeklySchedule[day].length === 0 ? (
                      <div className="text-gray-400 italic py-2">No availability set</div>
                    ) : (
                      weeklySchedule[day].map((slot, slotIndex) => (
                        <div key={slotIndex} className="flex items-center gap-3">
                          <input
                            type="time"
                            value={slot.start_time}
                            onChange={(e) => updateTimeSlot(day, slotIndex, 'start_time', e.target.value)}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="time"
                            value={slot.end_time}
                            onChange={(e) => updateTimeSlot(day, slotIndex, 'end_time', e.target.value)}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          <button
                            onClick={() => removeTimeSlot(day, slotIndex)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    onClick={() => addTimeSlot(day)}
                    className="flex items-center gap-1 px-3 py-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors text-sm font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Slot
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleSaveAvailability}
              disabled={saving}
              className="mt-8 w-full py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-primary-600 transition-all duration-300 shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Save Weekly Schedule
            </button>
          </motion.div>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="grid lg:grid-cols-3 gap-8"
          >
            {/* Calendar */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
              {/* Calendar Header */}
              <div className="bg-gradient-to-r from-primary-600 to-primary-500 px-6 py-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h2>
                    <p className="text-primary-100 text-sm mt-1">Manage your availability calendar</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={prevMonth}
                      className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors text-white"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextMonth}
                      className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl transition-colors text-white"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {/* Day Headers */}
                {DAY_LABELS.map((day, idx) => (
                  <div
                    key={day}
                    className={`p-3 text-center text-sm font-semibold rounded-lg ${
                      idx >= 5 ? 'text-rose-500 bg-rose-50' : 'text-gray-700 bg-gray-50'
                    }`}
                  >
                    {day}
                  </div>
                ))}

                {/* Calendar Days */}
                {getCalendarGrid().map((day, index) => (
                  <div
                    key={index}
                    className="aspect-square"
                  >
                    {day && (
                      <button
                        onClick={() => {
                          const today = new Date().toISOString().split('T')[0];
                          if (day.date >= today) {
                            setSelectedDate(day.date);
                          }
                        }}
                        disabled={day.date < new Date().toISOString().split('T')[0]}
                        className={`w-full h-full rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${getDayStyle(day)} ${
                          selectedDate === day.date ? 'ring-2 ring-primary-500 ring-offset-2' : ''
                        } ${day.date === new Date().toISOString().split('T')[0] ? 'ring-2 ring-blue-400' : ''}`}
                      >
                        <span className="text-base font-bold">
                          {parseInt(day.date.split('-')[2])}
                        </span>
                        {day.is_blocked && (
                          <span className="text-[10px] font-medium mt-0.5">Blocked</span>
                        )}
                        {hasBookings(day.date) && !day.is_blocked && (
                          <span className="text-[10px] font-medium mt-0.5">{getBookingsForDate(day.date).length} booked</span>
                        )}
                        {isWeekend(day.date) && !day.is_blocked && !hasBookings(day.date) && (
                          <span className="text-[10px] font-medium mt-0.5">Holiday</span>
                        )}
                        {day.is_available && day.slots_count > 0 && !isWeekend(day.date) && !day.is_blocked && !hasBookings(day.date) && (
                          <span className="text-[10px] font-medium mt-0.5">{day.slots_count} slots</span>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 mt-8 pt-6 border-t border-gray-200">
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                  <div className="w-4 h-4 rounded-md bg-blue-100 border-2 border-blue-300" />
                  <span className="text-sm font-medium text-blue-700">Booked</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-lg">
                  <div className="w-4 h-4 rounded-md bg-emerald-100 border border-emerald-200" />
                  <span className="text-sm font-medium text-emerald-700">Available</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 rounded-lg">
                  <div className="w-4 h-4 rounded-md bg-rose-50 border border-rose-200" />
                  <span className="text-sm font-medium text-rose-600">Weekend (Holiday)</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 rounded-lg">
                  <div className="w-4 h-4 rounded-md bg-red-200 border border-red-300" />
                  <span className="text-sm font-medium text-red-700">Blocked/Leave</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <div className="w-4 h-4 rounded-md bg-gray-100 border border-gray-200" />
                  <span className="text-sm font-medium text-gray-500">No Schedule Set</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                  <div className="w-4 h-4 rounded-md bg-white border-2 border-blue-400" />
                  <span className="text-sm font-medium text-blue-600">Today</span>
                </div>
              </div>
              </div>
            </div>

            {/* Block Date Panel */}
            <div className="space-y-6">
              {/* Block Date Form */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Block a Date</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Click on a date in the calendar or enter one below to mark it as unavailable.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={selectedDate || ''}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Reason (optional)</label>
                    <input
                      type="text"
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      placeholder="e.g., Personal leave, Holiday"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <button
                    onClick={handleBlockDate}
                    disabled={!selectedDate}
                    className="w-full py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Block This Date
                  </button>
                </div>
              </div>

              {/* Blocked Dates List */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Blocked Dates</h3>

                {blockedDates.length === 0 ? (
                  <p className="text-gray-500 text-sm">No blocked dates</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {blockedDates.map(blocked => (
                      <div
                        key={blocked.id}
                        className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-red-700">
                            {new Date(blocked.date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          {blocked.reason && (
                            <div className="text-sm text-red-600">{blocked.reason}</div>
                          )}
                        </div>
                        <button
                          onClick={() => handleUnblockDate(blocked.id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Bookings */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Video className="w-5 h-5 text-primary-600" />
                  Upcoming Bookings
                </h3>

                {bookings.filter(b => b.status !== 'cancelled' && new Date(b.scheduled_at) >= new Date()).length === 0 ? (
                  <p className="text-gray-500 text-sm">No upcoming bookings</p>
                ) : (
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {bookings
                      .filter(b => b.status !== 'cancelled' && new Date(b.scheduled_at) >= new Date())
                      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
                      .slice(0, 10)
                      .map(booking => (
                        <div
                          key={booking.id}
                          className={`p-4 rounded-xl border ${
                            booking.status === 'confirmed' ? 'bg-green-50 border-green-200' :
                            booking.status === 'pending' ? 'bg-yellow-50 border-yellow-200' :
                            'bg-blue-50 border-blue-100'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-semibold text-gray-900">
                                {booking.student_name || 'Student'}
                              </div>
                              <div className="text-sm text-gray-600 mt-1">
                                {booking.subject}
                              </div>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                              booking.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {booking.status}
                            </span>
                          </div>

                          <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(booking.scheduled_at).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {new Date(booking.scheduled_at).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>

                          <div className="mt-2 text-sm font-medium text-gray-700">
                            ${booking.price.toFixed(2)} • {booking.duration_minutes} min • {booking.session_type}
                          </div>

                          {/* Meet Link Section */}
                          {booking.status === 'confirmed' && (
                            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                              {booking.meeting_link ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                    <Video className="w-4 h-4 text-green-600" />
                                    Meet Link
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="text"
                                      value={booking.meeting_link}
                                      readOnly
                                      className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg"
                                    />
                                    <button
                                      onClick={() => copyToClipboard(booking.meeting_link!)}
                                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                      title="Copy link"
                                    >
                                      <Copy className="w-4 h-4" />
                                    </button>
                                    <a
                                      href={booking.meeting_link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                      title="Open Meet"
                                    >
                                      <ExternalLink className="w-4 h-4" />
                                    </a>
                                  </div>
                                </div>
                              ) : editingMeetLink === booking.id ? (
                                <div className="space-y-2">
                                  <div className="text-sm font-medium text-gray-700">Add Meet Link</div>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="url"
                                      value={meetLinkInput}
                                      onChange={(e) => setMeetLinkInput(e.target.value)}
                                      placeholder="https://meet.google.com/..."
                                      className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                    <button
                                      onClick={() => handleUpdateMeetLink(booking.id)}
                                      disabled={actionLoading === booking.id}
                                      className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                                    >
                                      {actionLoading === booking.id ? '...' : 'Save'}
                                    </button>
                                    <button
                                      onClick={() => { setEditingMeetLink(null); setMeetLinkInput(''); }}
                                      className="px-3 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setEditingMeetLink(booking.id)}
                                  className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                                >
                                  <Link className="w-4 h-4" />
                                  Add Meet link manually
                                </button>
                              )}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="mt-3 flex gap-2">
                            {booking.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleConfirmBooking(booking.id)}
                                  disabled={actionLoading === booking.id}
                                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                  {actionLoading === booking.id ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <>
                                      <Check className="w-4 h-4" />
                                      Confirm
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleCancelBooking(booking.id)}
                                  disabled={actionLoading === booking.id}
                                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                                >
                                  <X className="w-4 h-4" />
                                  Decline
                                </button>
                              </>
                            )}
                            {booking.status === 'confirmed' && (
                              <button
                                onClick={() => handleCancelBooking(booking.id)}
                                disabled={actionLoading === booking.id}
                                className="flex items-center justify-center gap-1 px-3 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                              >
                                <X className="w-4 h-4" />
                                Cancel Booking
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Earnings Tab */}
        {activeTab === 'earnings' && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Stats Cards */}
            {tutorStats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-xl">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {tutorStats.currency} {tutorStats.total_earnings.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">Total Earnings</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Wallet className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {tutorStats.currency} {tutorStats.available_balance.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">Available Balance</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-xl">
                      <TrendingUp className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{tutorStats.completed_sessions}</div>
                      <div className="text-sm text-gray-500">Sessions Completed</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 rounded-xl">
                      <ArrowDownCircle className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">
                        {tutorStats.currency} {tutorStats.withdrawn_amount.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-500">Total Withdrawn</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Monthly Stats & Withdrawal Request */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Monthly Stats */}
              {tutorStats && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary-600" />
                    This Month
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                      <span className="text-gray-600">Sessions</span>
                      <span className="text-xl font-bold text-gray-900">{tutorStats.monthly_sessions}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                      <span className="text-gray-600">Earnings</span>
                      <span className="text-xl font-bold text-green-600">
                        {tutorStats.currency} {tutorStats.monthly_earnings.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                      <span className="text-gray-600">Pending Sessions</span>
                      <span className="text-xl font-bold text-yellow-600">{tutorStats.pending_sessions}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                      <span className="text-gray-600">Pending Withdrawals</span>
                      <span className="text-xl font-bold text-orange-600">
                        {tutorStats.currency} {tutorStats.pending_withdrawals.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Request Withdrawal */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ArrowDownCircle className="w-5 h-5 text-primary-600" />
                  Request Withdrawal
                </h3>

                <div className="space-y-4">
                  {/* Available Balance Display */}
                  {tutorStats && (
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                      <div className="text-sm text-gray-600 mb-1">Available for Withdrawal</div>
                      <div className="text-2xl font-bold text-green-700">
                        {tutorStats.currency} {tutorStats.available_balance.toFixed(2)}
                      </div>
                    </div>
                  )}

                  {/* Amount Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                        {tutorStats?.currency || 'INR'}
                      </span>
                      <input
                        type="number"
                        value={withdrawalAmount}
                        onChange={(e) => setWithdrawalAmount(e.target.value)}
                        placeholder="Enter amount"
                        min="0"
                        step="0.01"
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setPaymentMethod('bank_transfer')}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          paymentMethod === 'bank_transfer'
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Building className="w-5 h-5" />
                        <span className="text-xs font-medium">Bank</span>
                      </button>
                      <button
                        onClick={() => setPaymentMethod('upi')}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          paymentMethod === 'upi'
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Smartphone className="w-5 h-5" />
                        <span className="text-xs font-medium">UPI</span>
                      </button>
                      <button
                        onClick={() => setPaymentMethod('paypal')}
                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                          paymentMethod === 'paypal'
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <CreditCard className="w-5 h-5" />
                        <span className="text-xs font-medium">PayPal</span>
                      </button>
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {paymentMethod === 'bank_transfer' ? 'Bank Account Details' :
                       paymentMethod === 'upi' ? 'UPI ID' : 'PayPal Email'}
                    </label>
                    <textarea
                      value={paymentDetails}
                      onChange={(e) => setPaymentDetails(e.target.value)}
                      placeholder={
                        paymentMethod === 'bank_transfer'
                          ? 'Enter bank name, account number, IFSC code...'
                          : paymentMethod === 'upi'
                          ? 'Enter your UPI ID (e.g., name@upi)'
                          : 'Enter your PayPal email address'
                      }
                      rows={paymentMethod === 'bank_transfer' ? 3 : 1}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleWithdrawalRequest}
                    disabled={withdrawalLoading || !withdrawalAmount || !paymentDetails}
                    className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold rounded-xl hover:from-primary-700 hover:to-primary-600 transition-all duration-300 shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {withdrawalLoading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ArrowDownCircle className="w-5 h-5" />
                        Request Withdrawal
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Withdrawal History */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary-600" />
                Withdrawal History
              </h3>

              {withdrawals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ArrowDownCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No withdrawal requests yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Amount</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Method</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {withdrawals.map(w => (
                        <tr key={w.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {new Date(w.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 font-medium">
                            {w.currency} {w.amount.toFixed(2)}
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-600 capitalize">
                            {w.payment_method.replace('_', ' ')}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                              w.status === 'completed' ? 'bg-green-100 text-green-700' :
                              w.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                              w.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {w.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm text-gray-500">
                            {w.admin_notes || '-'}
                            {w.transaction_id && (
                              <div className="text-xs text-gray-400 mt-1">
                                Txn: {w.transaction_id}
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TutorDashboard;
