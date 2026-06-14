import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from "react-router-dom";

function Dashboard() {
    const navigate = useNavigate();
    const chatEndRef = useRef(null);

    // Resolve API URL dynamically (local vs remote production fallback)
    const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? 'http://localhost:5000'
      : 'https://xeno-mini-crm-k8pv.onrender.com';

    // Core States
    const [activeTab, setActiveTab] = useState('campaigns'); // 'campaigns' | 'copilot' | 'shoppers'
    const [prompt, setPrompt] = useState('');
    const [channel, setChannel] = useState('WhatsApp');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [stats, setStats] = useState({ totalSent: 0, delivered: 0, opened: 0, failed: 0 });
    const [customers, setCustomers] = useState([]);

    // Copilot Chat States
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState([
        { sender: 'ai', text: 'Hello! I am your AI CRM Copilot. You can ask me business growth tips, request copywriting drafts (Email/SMS/WhatsApp), get dynamic dataset statistics, or command database edits (e.g., *"Add Rohit Sharma to Apparel category"*).' }
    ]);
    const [chatLoading, setChatLoading] = useState(false);

    // CRUD Customer States
    const [addForm, setAddForm] = useState({
        name: '',
        email: '',
        phone: '',
        preferredCategory: 'Apparel',
        totalOrders: '',
        totalSpent: '',
        lastOrderDaysAgo: ''
    });
    const [editingCustomer, setEditingCustomer] = useState(null);

    // Fetch live stats and customer lists from our Node.js backend
    const fetchDashboardData = async () => {
        try {
            const statsRes = await fetch(`${API_BASE}/api/stats`);
            const statsData = await statsRes.json();
            setStats(statsData);

            const custRes = await fetch(`${API_BASE}/api/customers`);
            const custData = await custRes.json();
            setCustomers(custData);
        } catch (err) {
            console.error("Error connecting to backend:", err);
        }
    };

    // Scroll chat list to bottom
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // Automatically poll the backend every 1 second to capture the async channel callbacks live!
    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 1000);
        return () => clearInterval(interval);
    }, []);

    // Scroll chat when messages update
    useEffect(() => {
        if (activeTab === 'copilot') {
            scrollToBottom();
        }
    }, [chatMessages, activeTab]);

    // Send natural language prompt to AI Campaign system
    const handleLaunchCampaign = async (e) => {
        e.preventDefault();
        if (!prompt) return alert("Please enter an AI prompt first!");

        setLoading(true);
        setMessage('');
        try {
            const res = await fetch(`${API_BASE}/api/campaigns/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, channel }),
            });
            const data = await res.json();
            setMessage(data.message || data.error);
        } catch (err) {
            setMessage("Failed to reach the server.");
        } finally {
            setLoading(false);
        }
    };

    // Send message to AI Copilot Agent
    const handleSendChat = async (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;

        const userMessage = chatInput;
        setChatMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
        setChatInput('');
        setChatLoading(true);

        try {
            const res = await fetch(`${API_BASE}/api/copilot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMessage }),
            });
            const data = await res.json();
            setChatMessages(prev => [...prev, { sender: 'ai', text: data.reply || data.error }]);
            // Trigger quick fetch data updates since chat actions might have modified customer DB
            fetchDashboardData();
        } catch (err) {
            setChatMessages(prev => [...prev, { sender: 'ai', text: 'Error communicating with AI Copilot server.' }]);
        } finally {
            setChatLoading(false);
        }
    };

    // Add customer manually
    const handleAddCustomer = async (e) => {
        e.preventDefault();
        if (!addForm.name || !addForm.email) return alert("Name and Email are required!");

        try {
            const res = await fetch(`${API_BASE}/api/customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...addForm,
                    totalOrders: Number(addForm.totalOrders) || 0,
                    totalSpent: Number(addForm.totalSpent) || 0,
                    lastOrderDaysAgo: Number(addForm.lastOrderDaysAgo) || 0
                })
            });
            if (res.ok) {
                setAddForm({
                    name: '',
                    email: '',
                    phone: '',
                    preferredCategory: 'Apparel',
                    totalOrders: '',
                    totalSpent: '',
                    lastOrderDaysAgo: ''
                });
                alert("Customer added successfully!");
                fetchDashboardData();
            } else {
                alert("Failed to save customer record.");
            }
        } catch (err) {
            alert("Error connecting to server.");
        }
    };

    // Update customer manually
    const handleUpdateCustomer = async (e) => {
        e.preventDefault();
        if (!editingCustomer.name || !editingCustomer.email) return alert("Name and Email are required!");

        try {
            const res = await fetch(`${API_BASE}/api/customers/${editingCustomer.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...editingCustomer,
                    totalOrders: Number(editingCustomer.totalOrders) || 0,
                    totalSpent: Number(editingCustomer.totalSpent) || 0,
                    lastOrderDaysAgo: Number(editingCustomer.lastOrderDaysAgo) || 0
                })
            });
            if (res.ok) {
                setEditingCustomer(null);
                alert("Customer updated successfully!");
                fetchDashboardData();
            } else {
                alert("Failed to update customer details.");
            }
        } catch (err) {
            alert("Error connecting to server.");
        }
    };

    // Delete customer
    const handleDeleteCustomer = async (id) => {
        if (!confirm("Are you sure you want to delete this customer?")) return;

        try {
            const res = await fetch(`${API_BASE}/api/customers/${id}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                alert("Customer deleted successfully.");
                fetchDashboardData();
            } else {
                alert("Failed to delete customer.");
            }
        } catch (err) {
            alert("Error connecting to server.");
        }
    };

    // Calculate rates for stats
    const deliveryRate = stats.totalSent > 0 ? Math.round((stats.delivered / stats.totalSent) * 100) : 0;
    const openRate = stats.totalSent > 0 ? Math.round((stats.opened / stats.totalSent) * 100) : 0;

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
        }}>
            {/* Background Blur Accents */}
            <div style={{
                position: "absolute",
                top: "-10%",
                right: "10%",
                width: "450px",
                height: "450px",
                background: "radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, rgba(0,0,0,0) 70%)",
                borderRadius: "50%",
                pointerEvents: "none",
                zIndex: 0
            }} />
            <div style={{
                position: "absolute",
                bottom: "10%",
                left: "-5%",
                width: "400px",
                height: "400px",
                background: "radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, rgba(0,0,0,0) 70%)",
                borderRadius: "50%",
                pointerEvents: "none",
                zIndex: 0
            }} />

            {/* Navigation Header */}
            <header className="glass-panel" style={{
                margin: '20px 24px 0',
                padding: '16px 28px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderRadius: '16px',
                zIndex: 1,
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.25) 100%)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '10px',
                        boxShadow: '0 0 15px rgba(99, 102, 241, 0.2)'
                    }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5">
                            <polygon points="12 2 2 7 12 12 22 7 12 2" />
                            <polyline points="2 17 12 22 22 17" />
                            <polyline points="2 12 12 17 22 12" />
                        </svg>
                    </div>
                    <div>
                        <h1 style={{
                            fontSize: '20px',
                            fontWeight: 700,
                            margin: 0,
                            letterSpacing: '-0.3px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}>
                            XENO <span style={{
                                fontSize: '11px',
                                background: 'rgba(99, 102, 241, 0.15)',
                                color: '#a5b4fc',
                                padding: '2px 8px',
                                borderRadius: '99px',
                                border: '1px solid rgba(99, 102, 241, 0.25)',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>AI-Console v2.0</span>
                        </h1>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                            display: 'inline-block',
                            width: '8px',
                            height: '8px',
                            backgroundColor: '#10b981',
                            borderRadius: '50%',
                            boxShadow: '0 0 10px #10b981'
                        }} />
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                            Admin Console
                        </span>
                    </div>

                    <button
                        onClick={() => {
                            localStorage.removeItem("loggedIn");
                            navigate("/");
                        }}
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: '#fca5a5',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all var(--transition-fast)'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = 'var(--accent-rose)';
                            e.currentTarget.style.color = '#fff';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                            e.currentTarget.style.color = '#fca5a5';
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <polyline points="16 17 21 12 16 7" />
                            <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Logout
                    </button>
                </div>
            </header>

            {/* TAB SELECTION NAVIGATION BAR */}
            <div style={{
                display: 'flex',
                gap: '12px',
                margin: '16px 24px 4px',
                zIndex: 1
            }}>
                <button
                    onClick={() => setActiveTab('campaigns')}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        border: activeTab === 'campaigns' ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                        background: activeTab === 'campaigns' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(13, 20, 38, 0.4)',
                        color: activeTab === 'campaigns' ? '#f8fafc' : 'var(--text-secondary)',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all var(--transition-fast)'
                    }}
                >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    ⚡ Campaign Center
                </button>

                <button
                    onClick={() => setActiveTab('copilot')}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        border: activeTab === 'copilot' ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                        background: activeTab === 'copilot' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(13, 20, 38, 0.4)',
                        color: activeTab === 'copilot' ? '#f8fafc' : 'var(--text-secondary)',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all var(--transition-fast)'
                    }}
                >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
                    💬 AI Copilot Chat
                </button>

                <button
                    onClick={() => setActiveTab('shoppers')}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '10px',
                        border: activeTab === 'shoppers' ? '1px solid rgba(6, 182, 212, 0.4)' : '1px solid rgba(255, 255, 255, 0.05)',
                        background: activeTab === 'shoppers' ? 'rgba(6, 182, 212, 0.15)' : 'rgba(13, 20, 38, 0.4)',
                        color: activeTab === 'shoppers' ? '#f8fafc' : 'var(--text-secondary)',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all var(--transition-fast)'
                    }}
                >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/></svg>
                    👥 Shopper Database
                </button>
            </div>

            {/* Main Content Dashboard */}
            <main style={{
                flex: 1,
                padding: '16px 24px 40px',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                maxWidth: '1440px',
                width: '100%',
                margin: '0 auto'
            }}>
                
                {/* ================= TAB 1: CAMPAIGN CENTER ================= */}
                {activeTab === 'campaigns' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
                        {/* STATS CARDS */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: '20px'
                        }}>
                            {/* Stat Card: Total Sent */}
                            <div className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.04, color: 'var(--primary)', transform: 'rotate(-15deg)' }}>
                                    <svg width="110" height="110" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                                </div>
                                <div style={{ display: 'flex', justifycontent: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Total Sent</span>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(99, 102, 241, 0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#818cf8',
                                        border: '1px solid rgba(99, 102, 241, 0.2)'
                                    }}>
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                                    </div>
                                </div>
                                <h2 className="glow-text-primary" style={{ fontSize: '32px', fontWeight: 800, color: '#f8fafc', marginBottom: '6px' }}>
                                    {stats.totalSent}
                                </h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    <span style={{ color: '#10b981', fontWeight: 600 }}>Live Feed</span>
                                    <span>updates every second</span>
                                </div>
                            </div>

                            {/* Stat Card: Delivered */}
                            <div className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.04, color: 'var(--accent-emerald)', transform: 'rotate(-15deg)' }}>
                                    <svg width="110" height="110" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                </div>
                                <div style={{ display: 'flex', justifycontent: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Delivered</span>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--accent-emerald)',
                                        border: '1px solid rgba(16, 185, 129, 0.2)'
                                    }}>
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                    </div>
                                </div>
                                <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#10b981', marginBottom: '6px' }}>
                                    {stats.delivered}
                                </h2>
                                <div style={{ marginTop: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                        <span>Delivery Rate</span>
                                        <span style={{ fontWeight: 600, color: '#10b981' }}>{deliveryRate}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                                        <div style={{ width: `${deliveryRate}%`, height: '100%', backgroundColor: '#10b981', borderRadius: '99px', transition: 'width 0.5s ease' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Stat Card: Opened */}
                            <div className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.04, color: 'var(--accent-purple)', transform: 'rotate(-15deg)' }}>
                                    <svg width="110" height="110" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                </div>
                                <div style={{ display: 'flex', justifycontent: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Opened</span>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(139, 92, 246, 0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--accent-purple)',
                                        border: '1px solid rgba(139, 92, 246, 0.2)'
                                    }}>
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                    </div>
                                </div>
                                <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#a78bfa', marginBottom: '6px' }}>
                                    {stats.opened}
                                </h2>
                                <div style={{ marginTop: '4px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                        <span>Open Rate</span>
                                        <span style={{ fontWeight: 600, color: '#a78bfa' }}>{openRate}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '99px', overflow: 'hidden' }}>
                                        <div style={{ width: `${openRate}%`, height: '100%', backgroundColor: '#a78bfa', borderRadius: '99px', transition: 'width 0.5s ease' }} />
                                    </div>
                                </div>
                            </div>

                            {/* Stat Card: Failed */}
                            <div className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.04, color: 'var(--accent-rose)', transform: 'rotate(-15deg)' }}>
                                    <svg width="110" height="110" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                </div>
                                <div style={{ display: 'flex', justifycontent: 'space-between', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Failed</span>
                                    <div style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '8px',
                                        backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--accent-rose)',
                                        border: '1px solid rgba(239, 68, 68, 0.2)'
                                    }}>
                                        <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                                    </div>
                                </div>
                                <h2 style={{ fontSize: '32px', fontWeight: 800, color: '#f87171', marginBottom: '6px' }}>
                                    {stats.failed}
                                </h2>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    <span style={{ color: '#ef4444', fontWeight: 600 }}>Bounce / Network</span>
                                    <span>transmission failures</span>
                                </div>
                            </div>
                        </div>

                        {/* SPLIT LAYOUT PANEL */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr',
                            gap: '24px',
                            alignItems: 'start'
                        }} className="dashboard-grid-layout">
                            {/* Left Side: Campaign Creator Form */}
                            <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
                                    <h2 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: '#f8fafc' }}>
                                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                                        Create AI Campaign
                                    </h2>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                        Send campaign triggers by describing segments in plain text.
                                    </p>
                                </div>

                                <form onSubmit={handleLaunchCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    <div>
                                        <label className="input-label">Describe Customer Segment</label>
                                        <textarea
                                            className="input-field"
                                            style={{ height: '96px', resize: 'none', fontSize: '14px', lineHeight: '1.5', padding: '12px 14px' }}
                                            placeholder="e.g., Shoppers with preferred category apparel who ordered more than 3 times"
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="input-label">Distribution Channel</label>
                                        <select
                                            className="input-field select-field"
                                            value={channel}
                                            onChange={(e) => setChannel(e.target.value)}
                                        >
                                            <option value="WhatsApp">WhatsApp</option>
                                            <option value="SMS">SMS (Text Message)</option>
                                            <option value="Email">Email Newsletter</option>
                                        </select>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="btn-primary"
                                        style={{ width: '100%', padding: '14px', marginTop: '8px' }}
                                    >
                                        {loading ? (
                                            <>
                                                <span className="loader-spinner" />
                                                Generating segments...
                                            </>
                                        ) : (
                                            <>
                                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                                                Launch AI Campaign
                                            </>
                                        )}
                                    </button>
                                </form>

                                {message && (
                                    <div style={{ marginTop: '10px', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.25)', overflow: 'hidden', boxShadow: '0 0 15px rgba(99, 102, 241, 0.05)' }}>
                                        <div style={{ backgroundColor: 'rgba(99, 102, 241, 0.08)', padding: '8px 14px', borderBottom: '1px solid rgba(99, 102, 241, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#a5b4fc', fontWeight: 600 }}>AI ENGINE TERMINAL</span>
                                            <span style={{ display: 'inline-block', width: '6px', height: '6px', backgroundColor: '#6366f1', borderRadius: '50%' }} />
                                        </div>
                                        <div style={{ padding: '14px', backgroundColor: 'rgba(15, 23, 42, 0.9)', fontFamily: 'Consolas, Monaco, monospace', fontSize: '12.5px', lineHeight: '1.6', color: '#34d399', maxHeight: '150px', overflowY: 'auto' }}>
                                            <span style={{ color: '#818cf8' }}>xeno-crm@ai:~$</span> {message}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Side: Customers List View */}
                            <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <h2 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: '#f8fafc' }}>
                                            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/></svg>
                                            Active Customers
                                        </h2>
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                            Manage and filter active user accounts.
                                        </p>
                                    </div>
                                    <span style={{ fontSize: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: '#f8fafc', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)', fontWeight: 600 }}>
                                        {customers.length} Shoppers
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '380px', overflowY: 'auto', paddingRight: '4px' }}>
                                    {customers.map((c) => {
                                        const isInactive = c.lastOrderDaysAgo > 90;
                                        const categoryColor = c.preferredCategory === 'Apparel' ? '#a78bfa' : c.preferredCategory === 'Footwear' ? '#22d3ee' : '#34d399';
                                        const categoryBg = c.preferredCategory === 'Apparel' ? 'rgba(167, 139, 250, 0.12)' : c.preferredCategory === 'Footwear' ? 'rgba(34, 211, 238, 0.12)' : 'rgba(52, 211, 153, 0.12)';
                                        const categoryBorder = c.preferredCategory === 'Apparel' ? 'rgba(167, 139, 250, 0.25)' : c.preferredCategory === 'Footwear' ? 'rgba(34, 211, 238, 0.25)' : 'rgba(52, 211, 153, 0.25)';

                                        return (
                                            <div
                                                key={c.id}
                                                style={{
                                                    padding: '16px',
                                                    backgroundColor: 'rgba(15, 23, 42, 0.4)',
                                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                                    borderRadius: '12px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '12px',
                                                    transition: 'all var(--transition-fast)'
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.7)';
                                                    e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.2)';
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'rgba(15, 23, 42, 0.4)';
                                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <div>
                                                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                                                            {c.name}
                                                        </h3>
                                                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
                                                            {c.email} • {c.phone}
                                                        </span>
                                                    </div>
                                                    <span style={{ fontSize: '11px', backgroundColor: categoryBg, color: categoryColor, border: `1px solid ${categoryBorder}`, padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                                                        {c.preferredCategory}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.03)', fontSize: '12px' }}>
                                                    <div style={{ display: 'flex', gap: '14px', color: 'var(--text-secondary)' }}>
                                                        <span>Orders: <strong style={{ color: 'var(--text-primary)' }}>{c.totalOrders}</strong></span>
                                                        <span>Spent: <strong style={{ color: 'var(--text-primary)' }}>₹{c.totalSpent.toLocaleString('en-IN')}</strong></span>
                                                    </div>
                                                    
                                                    {isInactive ? (
                                                        <span style={{ fontSize: '10.5px', color: '#f87171', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '2px 6px', borderRadius: '4px', fontWeight: 500 }}>
                                                            Inactive ({c.lastOrderDaysAgo}d ago)
                                                        </span>
                                                    ) : (
                                                        <span style={{ fontSize: '10.5px', color: '#34d399', backgroundColor: 'rgba(52, 211, 153, 0.1)', border: '1px solid rgba(52, 211, 153, 0.2)', padding: '2px 6px', borderRadius: '4px', fontWeight: 500 }}>
                                                            Active ({c.lastOrderDaysAgo}d ago)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= TAB 2: AI COPILOT CHATBOT ================= */}
                {activeTab === 'copilot' && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr',
                        gap: '24px',
                        minHeight: '620px',
                        alignItems: 'stretch'
                    }} className="dashboard-grid-layout animate-fade-in">
                        <style dangerouslySetInnerHTML={{__html: `
                            @media (min-width: 992px) {
                                .chat-container-layout {
                                    grid-template-columns: 300px 1fr !important;
                                }
                            }
                        `}} />

                        <div className="chat-container-layout" style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr',
                            gap: '24px'
                        }}>
                            {/* Chat Instructions & Shortcuts panel */}
                            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>💬 CRM Chat Copilot</h3>
                                    <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.4' }}>
                                        Talk to your AI CRM agent directly. Ask about customer spending patterns, generate promotional texts, or issue direct DB edits.
                                    </p>
                                </div>

                                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
                                    <h4 style={{ fontSize: '12px', fontWeight: 650, color: 'rgba(139, 92, 246, 0.8)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>Try Prompting:</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <button
                                            onClick={() => setChatInput("Summarize shopper category statistics")}
                                            className="input-field"
                                            style={{ cursor: 'pointer', textAlign: 'left', fontSize: '12px', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.02)' }}
                                            onMouseOver={(e) => e.target.style.borderColor = 'rgba(139, 92, 246, 0.4)'}
                                            onMouseOut={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                                        >
                                            📊 "Summarize shopper category statistics"
                                        </button>
                                        <button
                                            onClick={() => setChatInput("Write an email campaign draft template for footwear shoppers")}
                                            className="input-field"
                                            style={{ cursor: 'pointer', textAlign: 'left', fontSize: '12px', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.02)' }}
                                            onMouseOver={(e) => e.target.style.borderColor = 'rgba(139, 92, 246, 0.4)'}
                                            onMouseOut={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                                        >
                                            ✍️ "Write a footwear email template"
                                        </button>
                                        <button
                                            onClick={() => setChatInput("Add a customer: Rajesh Kumar, email: rajesh@xeno.com, preferredCategory: Footwear, totalOrders: 4, totalSpent: 9000, lastOrderDaysAgo: 10")}
                                            className="input-field"
                                            style={{ cursor: 'pointer', textAlign: 'left', fontSize: '12px', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.02)' }}
                                            onMouseOver={(e) => e.target.style.borderColor = 'rgba(139, 92, 246, 0.4)'}
                                            onMouseOut={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                                        >
                                            👤 "Add customer Rajesh Kumar..."
                                        </button>
                                        <button
                                            onClick={() => setChatInput("Launch a SMS campaign to shoppers with preferredCategory apparel")}
                                            className="input-field"
                                            style={{ cursor: 'pointer', textAlign: 'left', fontSize: '12px', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.02)' }}
                                            onMouseOver={(e) => e.target.style.borderColor = 'rgba(139, 92, 246, 0.4)'}
                                            onMouseOut={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
                                        >
                                            🚀 "Launch SMS apparel campaign"
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Chat Dialogue Card */}
                            <div className="glass-panel" style={{
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                height: '620px'
                            }}>
                                {/* Chat Header */}
                                <div style={{
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                    paddingBottom: '14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}>
                                    <div style={{
                                        width: '10px',
                                        height: '10px',
                                        backgroundColor: '#a78bfa',
                                        borderRadius: '50%',
                                        boxShadow: '0 0 8px #a78bfa'
                                    }} />
                                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                                        AI CRM Agent Connection Active
                                    </span>
                                </div>

                                {/* Messages View Scrollpane */}
                                <div style={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    padding: '16px 4px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '14px'
                                }}>
                                    {chatMessages.map((msg, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: 'flex',
                                                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                                                alignItems: 'flex-start',
                                                gap: '10px'
                                            }}
                                        >
                                            {msg.sender === 'ai' && (
                                                <div style={{
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '6px',
                                                    backgroundColor: 'rgba(139, 92, 246, 0.2)',
                                                    border: '1px solid rgba(139, 92, 246, 0.3)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#a78bfa',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold',
                                                    flexShrink: 0
                                                }}>
                                                    AI
                                                </div>
                                            )}

                                            <div style={{
                                                maxWidth: '75%',
                                                padding: '12px 16px',
                                                borderRadius: '12px',
                                                fontSize: '14px',
                                                lineHeight: '1.5',
                                                color: '#f8fafc',
                                                backgroundColor: msg.sender === 'user' ? 'rgba(99, 102, 241, 0.3)' : 'rgba(15, 23, 42, 0.5)',
                                                border: msg.sender === 'user' ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255, 255, 255, 0.04)',
                                                borderTopRightRadius: msg.sender === 'user' ? '2px' : '12px',
                                                borderTopLeftRadius: msg.sender === 'ai' ? '2px' : '12px',
                                                whiteSpace: 'pre-wrap',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                                            }}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))}

                                    {chatLoading && (
                                        <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '6px',
                                                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                flexShrink: 0
                                            }}>
                                                <span className="loader-spinner" style={{ width: '12px', height: '12px' }} />
                                            </div>
                                            <div style={{
                                                padding: '10px 14px',
                                                backgroundColor: 'rgba(15, 23, 42, 0.3)',
                                                border: '1px solid rgba(255, 255, 255, 0.04)',
                                                borderRadius: '12px',
                                                borderTopLeftRadius: '2px',
                                                color: 'var(--text-secondary)',
                                                fontSize: '13px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px'
                                            }}>
                                                Copilot is thinking...
                                            </div>
                                        </div>
                                    )}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Send Input Form */}
                                <form onSubmit={handleSendChat} style={{
                                    display: 'flex',
                                    gap: '10px',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                    paddingTop: '16px'
                                }}>
                                    <input
                                        className="input-field"
                                        style={{ flex: 1 }}
                                        placeholder="Type CRM command or question..."
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        disabled={chatLoading}
                                    />
                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        disabled={chatLoading || !chatInput.trim()}
                                        style={{
                                            padding: '12px 20px',
                                            background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
                                            boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)'
                                        }}
                                    >
                                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* ================= TAB 3: CUSTOMER CRUD MANAGER ================= */}
                {activeTab === 'shoppers' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="animate-fade-in">
                        
                        {/* Edit Customer Dialog Form Overlay */}
                        {editingCustomer && (
                            <div style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                backgroundColor: 'rgba(0,0,0,0.6)',
                                backdropFilter: 'blur(8px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 10,
                                padding: '24px'
                            }}>
                                <div className="glass-panel" style={{
                                    width: '100%',
                                    maxWidth: '520px',
                                    padding: '30px',
                                    position: 'relative'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#f8fafc', margin: 0 }}>✍️ Edit Customer Profile</h3>
                                        <button
                                            onClick={() => setEditingCustomer(null)}
                                            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer' }}
                                        >
                                            &times;
                                        </button>
                                    </div>

                                    <form onSubmit={handleUpdateCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div>
                                                <label className="input-label">Shopper Name</label>
                                                <input
                                                    className="input-field"
                                                    value={editingCustomer.name}
                                                    onChange={(e) => setEditingCustomer({...editingCustomer, name: e.target.value})}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="input-label">Preferred Category</label>
                                                <select
                                                    className="input-field select-field"
                                                    value={editingCustomer.preferredCategory}
                                                    onChange={(e) => setEditingCustomer({...editingCustomer, preferredCategory: e.target.value})}
                                                >
                                                    <option value="Apparel">Apparel</option>
                                                    <option value="Footwear">Footwear</option>
                                                    <option value="Electronics">Electronics</option>
                                                    <option value="Cosmetics">Cosmetics</option>
                                                    <option value="General">General</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div>
                                                <label className="input-label">Email Address</label>
                                                <input
                                                    className="input-field"
                                                    type="email"
                                                    value={editingCustomer.email}
                                                    onChange={(e) => setEditingCustomer({...editingCustomer, email: e.target.value})}
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="input-label">Phone Number</label>
                                                <input
                                                    className="input-field"
                                                    value={editingCustomer.phone}
                                                    onChange={(e) => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                            <div>
                                                <label className="input-label">Total Orders</label>
                                                <input
                                                    className="input-field"
                                                    type="number"
                                                    value={editingCustomer.totalOrders}
                                                    onChange={(e) => setEditingCustomer({...editingCustomer, totalOrders: e.target.value})}
                                                />
                                            </div>
                                            <div>
                                                <label className="input-label">Total Spent (₹)</label>
                                                <input
                                                    className="input-field"
                                                    type="number"
                                                    value={editingCustomer.totalSpent}
                                                    onChange={(e) => setEditingCustomer({...editingCustomer, totalSpent: e.target.value})}
                                                />
                                            </div>
                                            <div>
                                                <label className="input-label">Last Order (Days Ago)</label>
                                                <input
                                                    className="input-field"
                                                    type="number"
                                                    value={editingCustomer.lastOrderDaysAgo}
                                                    onChange={(e) => setEditingCustomer({...editingCustomer, lastOrderDaysAgo: e.target.value})}
                                                />
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                            <button
                                                type="submit"
                                                className="btn-primary"
                                                style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)' }}
                                            >
                                                Save Changes
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setEditingCustomer(null)}
                                                className="btn-primary"
                                                style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)', boxShadow: 'none' }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        {/* Customer CRUD Layout split */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr',
                            gap: '24px',
                            alignItems: 'start'
                        }} className="dashboard-grid-layout">
                            <style dangerouslySetInnerHTML={{__html: `
                                @media (min-width: 992px) {
                                    .dashboard-grid-layout {
                                        grid-template-columns: 1fr 2fr !important;
                                    }
                                }
                            `}} />

                            {/* Column 1: Add New Customer Card */}
                            <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
                                    <h2 style={{ fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', margin: 0, color: '#f8fafc' }}>
                                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
                                        Add New Shopper
                                    </h2>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                        Append a new customer record to the persistent database.
                                    </p>
                                </div>

                                <form onSubmit={handleAddCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <label className="input-label">Customer Name</label>
                                        <input
                                            className="input-field"
                                            placeholder="Amit Kumar"
                                            value={addForm.name}
                                            onChange={(e) => setAddForm({...addForm, name: e.target.value})}
                                            required
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '14px' }}>
                                        <div>
                                            <label className="input-label">Preferred Category</label>
                                            <select
                                                className="input-field select-field"
                                                value={addForm.preferredCategory}
                                                onChange={(e) => setAddForm({...addForm, preferredCategory: e.target.value})}
                                            >
                                                <option value="Apparel">Apparel</option>
                                                <option value="Footwear">Footwear</option>
                                                <option value="Electronics">Electronics</option>
                                                <option value="Cosmetics">Cosmetics</option>
                                                <option value="General">General</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="input-label">Phone</label>
                                            <input
                                                className="input-field"
                                                placeholder="+919988776655"
                                                value={addForm.phone}
                                                onChange={(e) => setAddForm({...addForm, phone: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="input-label">Email Address</label>
                                        <input
                                            className="input-field"
                                            type="email"
                                            placeholder="amit@gmail.com"
                                            value={addForm.email}
                                            onChange={(e) => setAddForm({...addForm, email: e.target.value})}
                                            required
                                        />
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label className="input-label">Orders</label>
                                            <input
                                                className="input-field"
                                                type="number"
                                                placeholder="2"
                                                value={addForm.totalOrders}
                                                onChange={(e) => setAddForm({...addForm, totalOrders: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="input-label">Spent (₹)</label>
                                            <input
                                                className="input-field"
                                                type="number"
                                                placeholder="4500"
                                                value={addForm.totalSpent}
                                                onChange={(e) => setAddForm({...addForm, totalSpent: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="input-label">Recency(d)</label>
                                            <input
                                                className="input-field"
                                                type="number"
                                                placeholder="5"
                                                value={addForm.lastOrderDaysAgo}
                                                onChange={(e) => setAddForm({...addForm, lastOrderDaysAgo: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="btn-primary"
                                        style={{
                                            width: '100%',
                                            padding: '13px',
                                            background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                                            boxShadow: '0 4px 14px rgba(6, 182, 212, 0.3)',
                                            marginTop: '8px'
                                        }}
                                    >
                                        Save Customer Record
                                    </button>
                                </form>
                            </div>

                            {/* Column 2: Shoppers List Table */}
                            <div className="glass-panel" style={{ padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', overflowX: 'hidden' }}>
                                <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '16px' }}>
                                    <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                                        👥 Customer Database Directory
                                    </h2>
                                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                                        Manually modify profiles or delete users. Changes persist inside dataset.json.
                                    </p>
                                </div>

                                <div style={{ overflowX: 'auto', width: '100%' }}>
                                    <table style={{
                                        width: '100%',
                                        borderCollapse: 'collapse',
                                        fontSize: '13px',
                                        color: '#f8fafc',
                                        textAlign: 'left'
                                    }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)' }}>
                                                <th style={{ padding: '12px 8px', fontWeight: 600 }}>Customer</th>
                                                <th style={{ padding: '12px 8px', fontWeight: 600 }}>Category</th>
                                                <th style={{ padding: '12px 8px', fontWeight: 600 }}>Orders</th>
                                                <th style={{ padding: '12px 8px', fontWeight: 600 }}>Spent</th>
                                                <th style={{ padding: '12px 8px', fontWeight: 600 }}>Recency</th>
                                                <th style={{ padding: '12px 8px', fontWeight: 600, textAlign: 'center' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {customers.map((c) => {
                                                const categoryColor = c.preferredCategory === 'Apparel' ? '#a78bfa' : c.preferredCategory === 'Footwear' ? '#22d3ee' : '#34d399';
                                                const categoryBg = c.preferredCategory === 'Apparel' ? 'rgba(167, 139, 250, 0.12)' : c.preferredCategory === 'Footwear' ? 'rgba(34, 211, 238, 0.12)' : 'rgba(52, 211, 153, 0.12)';

                                                return (
                                                    <tr
                                                        key={c.id}
                                                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', transition: 'background 0.2s' }}
                                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}
                                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                                    >
                                                        <td style={{ padding: '14px 8px' }}>
                                                            <div style={{ fontWeight: 600 }}>{c.name}</div>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{c.email}</div>
                                                        </td>
                                                        <td style={{ padding: '14px 8px' }}>
                                                            <span style={{ fontSize: '11px', backgroundColor: categoryBg, color: categoryColor, padding: '2px 8px', borderRadius: '6px', fontWeight: 600, border: `1px solid ${categoryBg}` }}>
                                                                {c.preferredCategory}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '14px 8px', fontWeight: 600 }}>{c.totalOrders}</td>
                                                        <td style={{ padding: '14px 8px' }}>₹{c.totalSpent.toLocaleString('en-IN')}</td>
                                                        <td style={{ padding: '14px 8px' }}>{c.lastOrderDaysAgo} days ago</td>
                                                        <td style={{ padding: '14px 8px', textAlign: 'center' }}>
                                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                                {/* Edit Button */}
                                                                <button
                                                                    onClick={() => setEditingCustomer(c)}
                                                                    style={{
                                                                        background: 'rgba(6, 182, 212, 0.1)',
                                                                        border: '1px solid rgba(6, 182, 212, 0.2)',
                                                                        color: '#22d3ee',
                                                                        padding: '6px 10px',
                                                                        borderRadius: '6px',
                                                                        cursor: 'pointer',
                                                                        fontSize: '11.5px',
                                                                        fontWeight: 600
                                                                    }}
                                                                >
                                                                    Edit
                                                                </button>
                                                                {/* Delete Button */}
                                                                <button
                                                                    onClick={() => handleDeleteCustomer(c.id)}
                                                                    style={{
                                                                        background: 'rgba(239, 68, 68, 0.1)',
                                                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                                                        color: '#fca5a5',
                                                                        padding: '6px 10px',
                                                                        borderRadius: '6px',
                                                                        cursor: 'pointer',
                                                                        fontSize: '11.5px',
                                                                        fontWeight: 600
                                                                    }}
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    {customers.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                                            No shopper records found in database.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default Dashboard;