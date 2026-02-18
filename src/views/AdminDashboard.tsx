import React, { useMemo, useState } from 'react';
import { useStore } from '../contexts/StateContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Car, CreditCard, Download, AlertCircle, Edit3, Trash2, X, Check, Search, ChevronLeft, ChevronRight, Calendar, FileCode, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Multa } from '../types';

const AdminDashboard: React.FC = () => {
    const {
        tarjetas, vehiculos, conductores, vehiculosArchivados, conductoresArchivados,
        restoreVehiculo, restoreConductor, registrarPago, multas,
        pagarMulta, updateMulta, removeMulta, auditoriaDesbloqueos,
        printSettings, updatePrintSettings, diasNoHabiles, toggleDiaNoHabil,
        asignacionesR, updateAsignacionesR, batchUpdateAsignacionesR, getDynamicVariacion
    } = useStore();

    const getLocalDateStr = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const [activeAdminTab, setActiveAdminTab] = useState<'resumen' | 'caja' | 'vencimientos' | 'multas' | 'auditoria' | 'impresion' | 'calendario' | 'reportes' | 'rotacionR' | 'archivados'>('resumen');
    // Estado para edición de multas
    const [editingMultaId, setEditingMultaId] = React.useState<number | null>(null);
    const [editFineFormData, setEditFineFormData] = React.useState<Partial<Multa>>({});
    const [auditFilter, setAuditFilter] = React.useState('');
    const [calMonth, setCalMonth] = React.useState(new Date());
    const [showTodaySalesModal, setShowTodaySalesModal] = React.useState(false);
    const [showMonthSalesModal, setShowMonthSalesModal] = React.useState(false);
    const [selectedDateR, setSelectedDateR] = React.useState<string>(getLocalDateStr(new Date()));
    const [selectedReportDate, setSelectedReportDate] = React.useState<string>(getLocalDateStr(new Date()));
    const [editRText, setEditRText] = React.useState('');

    const handleGenerateMonthlyRotation = () => {
        const confirm = window.confirm(`¿Seguro que deseas generar la planificación de la Variante R para todo el mes de ${calMonth.toLocaleString('es-CL', { month: 'long' })}? Se sobrescribirá cualquier cambio manual previo.`);
        if (!confirm) return;

        const dCount = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
        const newBatch: Record<string, number[]> = {};

        for (let i = 1; i <= dCount; i++) {
            const dateObj = new Date(calMonth.getFullYear(), calMonth.getMonth(), i);
            const dStr = getLocalDateStr(dateObj);
            
            // Usamos la lógica de rotación automática para proponer el mes
            // (Esta es la lógica de 8 de Troncal y 8 de Variante 2 por día)
            const epoch = new Date(2024, 0, 1);
            const diffTime = Math.abs(dateObj.getTime() - epoch.getTime());
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            const troncales = vehiculos
                .filter(v => !v.bloqueado && (v.rutaPrincipal === 'Troncal' || !v.rutaPrincipal))
                .sort((a,b) => a.id - b.id);
            const variante2s = vehiculos
                .filter(v => !v.bloqueado && v.rutaPrincipal === 'Variante 2')
                .sort((a,b) => a.id - b.id);
            
            const selectedIds: number[] = [];

            if (troncales.length > 0) {
                const startIdx = (diffDays * 8) % troncales.length;
                for (let j = 0; j < 8; j++) {
                    selectedIds.push(troncales[(startIdx + j) % troncales.length].id);
                }
            }

            if (variante2s.length > 0) {
                const startIdx = (diffDays * 8) % variante2s.length;
                for (let j = 0; j < 8; j++) {
                    selectedIds.push(variante2s[(startIdx + j) % variante2s.length].id);
                }
            }

            newBatch[dStr] = selectedIds;
        }

        batchUpdateAsignacionesR(newBatch);
        alert('Planificación mensual generada y guardada correctamente.');
    };

    // Mantener sincronizado el texto de edición de R con la fecha seleccionada
    React.useEffect(() => {
        const currentIds = asignacionesR[selectedDateR] || vehiculos.filter(v => getDynamicVariacion(v.id, new Date(selectedDateR + 'T12:00:00')) === 'R').map(v => v.id);
        setEditRText(currentIds.join(', '));
    }, [selectedDateR, asignacionesR, vehiculos, getDynamicVariacion]);

    const filteredAuditoria = useMemo(() => {
        return auditoriaDesbloqueos.filter(a =>
            a.vehiculoId.toString().includes(auditFilter) ||
            a.motivo.toLowerCase().includes(auditFilter.toLowerCase())
        ).reverse();
    }, [auditoriaDesbloqueos, auditFilter]);

    const stats = useMemo(() => {
        const now = new Date();
        const today = getLocalDateStr(now);
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const salesToday = tarjetas.filter(t => getLocalDateStr(new Date(t.fechaEmision)) === today).length * 2500;
        const salesMonth = tarjetas.filter(t => {
            const d = new Date(t.fechaEmision);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        }).length * 2500;

        const totalVehicles = vehiculos.length;
        const activeDrivers = conductores.filter(c => !c.bloqueado).length;

        // Calcular datos del gráfico basados en los últimos 7 días
        const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
        const chartData = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const dateStr = getLocalDateStr(d);
            const daySales = tarjetas.filter(t => getLocalDateStr(new Date(t.fechaEmision)) === dateStr).length * 2500;
            return {
                name: days[d.getDay()],
                sales: daySales
            };
        });

        return { salesToday, salesMonth, totalVehicles, activeDrivers, chartData };
    }, [tarjetas, vehiculos, conductores]);

    const todaySalesDetails = useMemo(() => {
        const today = getLocalDateStr(new Date());
        return tarjetas
            .filter(t => getLocalDateStr(new Date(t.fechaEmision)) === today)
            .map(t => ({
                ...t,
                patente: vehiculos.find(v => v.id === t.vehiculoId)?.patente || 'N/A'
            }))
            .sort((a, b) => a.vehiculoId - b.vehiculoId);
    }, [tarjetas, vehiculos]);

    const monthSalesDetails = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthTarjetas = tarjetas.filter(t => {
            const d = new Date(t.fechaEmision);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

        const grouped = monthTarjetas.reduce((acc, t) => {
            const dateKey = getLocalDateStr(new Date(t.fechaEmision));
            if (!acc[dateKey]) {
                acc[dateKey] = {
                    date: dateKey,
                    count: 0,
                    total: 0
                };
            }
            acc[dateKey].count += 1;
            acc[dateKey].total += t.valor;
            return acc;
        }, {} as Record<string, { date: string, count: number, total: number }>);

        return Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
    }, [tarjetas]);

    // Manejo de pagos en la pestaña de caja
    const [paymentData, setPaymentData] = React.useState({ id: '', monto: '', tipo: 'deuda' as 'deuda' | 'multa' });
    const handlePayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentData.id || !paymentData.monto) return;
        registrarPago(parseInt(paymentData.id), parseInt(paymentData.monto), paymentData.tipo);
        setPaymentData({ id: '', monto: '', tipo: 'deuda' });
        alert('Pago registrado correctamente');
    };

    const vencimientosProximos = useMemo(() => {
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setMonth(today.getMonth() + 1);

        return vehiculos.filter(v => {
            const rev = new Date(v.vencimientoRevisionTecnica);
            const seg = new Date(v.vencimientoSeguro);
            return rev < nextMonth || seg < nextMonth;
        }).sort((a, b) => new Date(a.vencimientoRevisionTecnica).getTime() - new Date(b.vencimientoRevisionTecnica).getTime());
    }, [vehiculos]);

    const vencimientosConductores = useMemo(() => {
        const today = new Date();
        const nextMonth = new Date();
        nextMonth.setMonth(today.getMonth() + 1);

        return conductores.filter(c => {
            const v = new Date(c.vencimientoLicencia);
            return v < nextMonth;
        }).sort((a, b) => new Date(a.vencimientoLicencia).getTime() - new Date(b.vencimientoLicencia).getTime());
    }, [conductores]);

    const downloadDailyReport = (dateStr: string, format: 'csv' | 'xlsx' = 'csv') => {
        const dayTickets = tarjetas.filter(t => getLocalDateStr(new Date(t.fechaEmision)) === dateStr);
        
        const data = dayTickets.map(t => {
            const v = vehiculos.find(veh => veh.id === t.vehiculoId);
            const c = conductores.find(cond => cond.vehiculoId === t.vehiculoId);
            return {
                Cupo: t.vehiculoId,
                Folio: t.folio,
                Venta: t.valor,
                Patente: v?.patente || 'N/A',
                Conductor: c?.nombre || 'N/A',
                'Ruta/Variación': t.variacion,
                'Fecha Uso': t.fechaUso ? t.fechaUso.split('T')[0] : ''
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Ventas");

        if (format === 'csv') {
            XLSX.writeFile(workbook, `Ventas_Diarias_${dateStr}.csv`, { bookType: 'csv' });
        } else {
            XLSX.writeFile(workbook, `Ventas_Diarias_${dateStr}.xlsx`);
        }
    };

    const downloadReport = (targetDate: Date = new Date(), format: 'csv' | 'xlsx' = 'csv') => {
        const year = targetDate.getFullYear();
        const month = targetDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        const monthTickets = tarjetas.filter(t => {
            if (!t.fechaUso) return false;
            const d = new Date(t.fechaUso);
            return d.getMonth() === month && d.getFullYear() === year;
        });

        const data = [...vehiculos].sort((a,b) => a.id - b.id).map(v => {
            const row: any = { "Cupo": v.id };
            let totalMonthTickets = 0;

            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const ticket = monthTickets.find(t => t.vehiculoId === v.id && (t.fechaUso?.startsWith(dateStr) ?? false));
                
                const dayKey = day.toString();
                if (ticket) {
                    row[dayKey] = ticket.folio;
                    totalMonthTickets++;
                } else {
                    row[dayKey] = "";
                }
            }
            row["Total"] = totalMonthTickets;
            return row;
        });

        const headers = ["Cupo", ...Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString()), "Total"];
        const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");

        if (format === 'csv') {
            XLSX.writeFile(workbook, `Reporte_Folios_${targetDate.getMonth() + 1}_${year}.csv`, { bookType: 'csv' });
        } else {
            const fileName = `Reporte_Folios_${targetDate.toLocaleString('es-CL', { month: 'long', year: 'numeric' }).replace(' ', '_')}.xlsx`;
            XLSX.writeFile(workbook, fileName);
        }
    };

    // Generar lista de los últimos 12 meses
    const historicalMonths = useMemo(() => {
        const months = [];
        for (let i = 0; i < 12; i++) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            months.push(new Date(d.getFullYear(), d.getMonth(), 1));
        }
        return months;
    }, []);

    return (
        <div className="space-y-8">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">Panel de Administración</h2>
                    <p className="text-slate-500">Resumen operativo y financiero de la Línea 8.</p>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button
                        onClick={() => downloadReport(new Date(), 'csv')}
                        className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200 transition font-bold text-xs"
                    >
                        <FileCode size={18} />
                        CSV
                    </button>
                    <button
                        onClick={() => downloadReport(new Date(), 'xlsx')}
                        className="flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-200 transition font-bold text-xs"
                    >
                        <FileText size={18} />
                        Excel
                    </button>
                </div>
            </header>

            {/* Tabs Internas del Admin */}
            <div className="flex gap-6 border-b border-slate-200">
                <button onClick={() => setActiveAdminTab('resumen')} className={`pb-2 font-bold transition ${activeAdminTab === 'resumen' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-400'}`}>Resumen</button>
                <button onClick={() => setActiveAdminTab('caja')} className={`pb-2 font-bold transition ${activeAdminTab === 'caja' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-400'}`}>Caja / Pagos</button>
                <button onClick={() => setActiveAdminTab('multas')} className={`pb-2 font-bold transition ${activeAdminTab === 'multas' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-400'}`}>Historial Multas</button>
                <button onClick={() => setActiveAdminTab('vencimientos')} className={`pb-2 font-bold transition ${activeAdminTab === 'vencimientos' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-400'}`}>Vencimientos ({vencimientosProximos.length + vencimientosConductores.length})</button>
                <button onClick={() => setActiveAdminTab('auditoria')} className={`pb-2 font-bold transition ${activeAdminTab === 'auditoria' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-400'}`}>
                    Auditoría {auditoriaDesbloqueos.length > 0 && <span className="ml-1 bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full text-[10px]">{auditoriaDesbloqueos.length}</span>}
                </button>
                <button onClick={() => setActiveAdminTab('reportes')} className={`pb-2 font-bold transition ${activeAdminTab === 'reportes' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-400'}`}>Reportes</button>
                <button onClick={() => setActiveAdminTab('impresion')} className={`pb-2 font-bold transition ${activeAdminTab === 'impresion' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-400'}`}>
                    Config. Impresión
                </button>
                <button onClick={() => setActiveAdminTab('rotacionR')} className={`pb-2 font-bold transition ${activeAdminTab === 'rotacionR' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-400'}`}>Rotación R</button>
                <button onClick={() => setActiveAdminTab('calendario')} className={`pb-2 font-bold transition ${activeAdminTab === 'calendario' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-400'}`}>
                    Días Feriados
                </button>
                <button onClick={() => setActiveAdminTab('archivados')} className={`pb-2 font-bold transition ${activeAdminTab === 'archivados' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-400'}`}>
                    Archivados ({vehiculosArchivados.length + conductoresArchivados.length})
                </button>
            </div>

            {activeAdminTab === 'resumen' && (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard 
                            title="Ventas Hoy" 
                            value={`$${stats.salesToday.toLocaleString()}`} 
                            icon={TrendingUp} 
                            color="blue" 
                            onClick={() => setShowTodaySalesModal(true)}
                        />
                        <StatCard 
                            title="Recaudación Mensual" 
                            value={`$${stats.salesMonth.toLocaleString()}`} 
                            icon={CreditCard} 
                            color="green" 
                            onClick={() => setShowMonthSalesModal(true)}
                        />
                        <StatCard title="Vehículos" value={stats.totalVehicles.toString()} icon={Car} color="orange" />
                        <StatCard title="Conductores Habilitados" value={stats.activeDrivers.toString()} icon={Users} color="purple" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Sales Chart */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="text-lg font-semibold mb-6">Ventas de los últimos 7 días</h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats.chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            cursor={{ fill: '#f8fafc' }}
                                        />
                                        <Bar dataKey="sales" fill="#f97316" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Control de Cuotas Mensuales */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <AlertCircle size={20} className="text-orange-500" />
                                Estado de Cuotas ($62.500/mes)
                            </h3>
                            <div className="space-y-4 max-h-64 overflow-auto pr-2">
                                {vehiculos.map(v => {
                                    const currentMonthCards = tarjetas.filter(t => {
                                        const d = new Date(t.fechaEmision);
                                        return d.getMonth() === new Date().getMonth() && t.vehiculoId === v.id;
                                    });
                                    const paid = currentMonthCards.length * 2500;
                                    const debt = Math.max(0, 62500 - paid);
                                    const percent = Math.min(100, (paid / 62500) * 100);

                                    return (
                                        <div key={v.id} className="space-y-1">
                                            <div className="flex justify-between text-xs font-bold mb-1">
                                                <span className="text-slate-700">Vehículo #{v.id}</span>
                                                <span className={debt > 0 ? 'text-red-600' : 'text-green-600'}>
                                                    {debt > 0 ? `Pendiente $${debt.toLocaleString()}` : 'Completado'}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-700 ${percent === 100 ? 'bg-green-500' : 'bg-orange-500'}`}
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Recent Transactions */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2">
                            <h3 className="text-lg font-semibold mb-6">Últimas Ventas Realizadas</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-xs font-bold text-slate-400 uppercase border-b">
                                            <th className="pb-3 px-2">Folio</th>
                                            <th className="pb-3 px-2">Línea</th>
                                            <th className="pb-3 px-2">Fecha/Hora</th>
                                            <th className="pb-3 px-2 text-right">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {tarjetas.slice(-10).reverse().map((t, i) => (
                                            <tr key={i} className="text-sm hover:bg-slate-50 transition">
                                                <td className="py-4 px-2 font-mono text-slate-500">{t.folio}</td>
                                                <td className="py-4 px-2 font-bold text-slate-800">#{t.vehiculoId}</td>
                                                <td className="py-4 px-2 text-slate-600">{new Date(t.fechaEmision).toLocaleString()}</td>
                                                <td className="py-4 px-2 text-right font-black text-slate-900">${t.valor.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        {tarjetas.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="py-10 text-center text-slate-400 italic">No se han registrado ventas aún.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Modal Detalle de Ventas Hoy */}
                    {showTodaySalesModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <div className="w-full max-w-2xl overflow-hidden bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
                                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                            <TrendingUp size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800">Ventas Registradas Hoy</h3>
                                            <p className="text-xs text-slate-500 font-medium">{new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setShowTodaySalesModal(false)}
                                        className="p-2 hover:bg-slate-200 rounded-full transition text-slate-400 hover:text-slate-600"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="max-h-[60vh] overflow-y-auto p-0">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 bg-white shadow-sm">
                                            <tr className="text-[10px] font-black text-slate-400 uppercase border-b bg-slate-50/50">
                                                <th className="py-3 px-6">Vehículo</th>
                                                <th className="py-3 px-6">Folio</th>
                                                <th className="py-3 px-6">Uso Para</th>
                                                <th className="py-3 px-6 text-right">Monto</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {todaySalesDetails.map((t, i) => (
                                                <tr key={i} className="text-sm hover:bg-blue-50/30 transition-colors group">
                                                    <td className="py-4 px-6">
                                                        <div className="flex flex-col">
                                                            <span className="font-black text-slate-800">#{t.vehiculoId}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{t.patente}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className="px-2 py-1 bg-slate-100 rounded text-[11px] font-mono text-slate-500 border border-slate-200 group-hover:bg-white transition-colors">
                                                            {t.folio}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6">
                                                        <span className="text-slate-600 font-medium">
                                                            {t.fechaUso ? new Date(t.fechaUso).toLocaleDateString() : ''}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        <span className="font-black text-blue-600">${t.valor.toLocaleString()}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {todaySalesDetails.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="py-12 text-center">
                                                        <div className="flex flex-col items-center gap-2 text-slate-400">
                                                            <CreditCard size={32} className="opacity-20" />
                                                            <p className="italic font-medium">No se han registrado ventas el día de hoy.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-4 bg-slate-50 border-t flex justify-between items-center px-8">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Total Hoy: {todaySalesDetails.length} Ventas</span>
                                    <span className="text-lg font-black text-slate-800">${stats.salesToday.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modal Detalle de Recaudación Mensual */}
                    {showMonthSalesModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                            <div className="w-full max-w-2xl overflow-hidden bg-white rounded-2xl shadow-2xl animate-in fade-in zoom-in duration-200">
                                <div className="p-6 border-b flex justify-between items-center bg-green-50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                                            <CreditCard size={20} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-800">Recaudación {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })}</h3>
                                            <p className="text-xs text-slate-500 font-medium whitespace-nowrap">Resumen diario de ventas del mes en curso.</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setShowMonthSalesModal(false)}
                                        className="p-2 hover:bg-green-100 rounded-full transition text-slate-400 hover:text-green-600"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                <div className="max-h-[60vh] overflow-y-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 bg-white shadow-sm">
                                            <tr className="text-[10px] font-black text-slate-400 uppercase border-b bg-slate-50/50">
                                                <th className="py-3 px-6">Fecha</th>
                                                <th className="py-3 px-6 text-center">Tarjetas</th>
                                                <th className="py-3 px-6 text-right">Total Diario</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {monthSalesDetails.map((day, i) => (
                                                <tr key={i} className="text-sm hover:bg-green-50/30 transition-colors">
                                                    <td className="py-4 px-6 font-bold text-slate-700">
                                                        {new Date(day.date + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}
                                                    </td>
                                                    <td className="py-4 px-6 text-center">
                                                        <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-black text-slate-600">
                                                            {day.count} {day.count === 1 ? 'tarjeta' : 'tarjetas'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-6 text-right font-black text-slate-900">
                                                        ${day.total.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            {monthSalesDetails.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="py-12 text-center text-slate-400 italic">No hay ventas registradas este mes.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-4 bg-slate-50 border-t flex justify-between items-center px-8">
                                    <span className="text-xs font-bold text-slate-500 uppercase">Total Mensual Acumulado:</span>
                                    <span className="text-lg font-black text-green-600 font-mono">${stats.salesMonth.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {activeAdminTab === 'caja' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-800 mb-6">Registrar Pago de Deuda o Multa</h3>
                        <form onSubmit={handlePayment} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vehículo (Nº Línea)</label>
                                <select
                                    value={paymentData.id}
                                    onChange={e => setPaymentData({ ...paymentData, id: e.target.value })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                >
                                    <option value="">Seleccionar vehículo...</option>
                                    {vehiculos.map(v => (
                                        <option key={v.id} value={v.id}>#{v.id} - {v.propietario} ({v.patente})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                                    <select
                                        value={paymentData.tipo}
                                        onChange={e => setPaymentData({ ...paymentData, tipo: e.target.value as any })}
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    >
                                        <option value="deuda">Cuota Mensual / Deuda</option>
                                        <option value="multa">Multa</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto a Pagar</label>
                                    <input
                                        type="number"
                                        value={paymentData.monto}
                                        onChange={e => setPaymentData({ ...paymentData, monto: e.target.value })}
                                        placeholder="Ej: 5000"
                                        className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                                    />
                                </div>
                            </div>
                            <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-black transition">
                                Confirmar Pago
                            </button>
                        </form>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Estado de Deudas Críticas</h3>
                        <div className="space-y-4">
                            {vehiculos.filter(v => v.estadoCuenta.deudas > 0 || v.estadoCuenta.multas > 0).map(v => {
                                const totalMultasPendientes = multas.filter(m => m.vehiculoId === v.id && !m.pagada).reduce((acc, m) => acc + m.monto, 0);
                                return (
                                    <div key={v.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                                        <div>
                                            <p className="font-bold text-slate-800">Vehículo #{v.id} - {v.propietario}</p>
                                            <p className="text-xs text-slate-500">{v.patente}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-black text-red-600">Total: ${(v.estadoCuenta.deudas + totalMultasPendientes).toLocaleString()}</p>
                                            <button
                                                onClick={() => setActiveAdminTab('multas')}
                                                className="text-[10px] text-blue-600 hover:underline font-bold"
                                            >
                                                Ver {multas.filter(m => m.vehiculoId === v.id && !m.pagada).length} Multas
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {activeAdminTab === 'multas' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Fecha / Plazo</th>
                                <th className="px-6 py-4">Sujeto</th>
                                <th className="px-6 py-4">Motivo / Tipo</th>
                                <th className="px-6 py-4">Monto</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {multas.slice().reverse().map(m => {
                                const conductor = conductores.find(c => c.rut === m.conductorRut);
                                const isEditing = editingMultaId === m.id;
                                const isExpired = !m.pagada && m.fechaVencimiento && new Date(m.fechaVencimiento) < new Date();

                                if (isEditing) {
                                    return (
                                        <tr key={m.id} className="bg-orange-50">
                                            <td className="px-6 py-4" colSpan={6}>
                                                <div className="flex flex-wrap gap-4 items-end">
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Motivo</label>
                                                        <input
                                                            type="text"
                                                            value={editFineFormData.motivo}
                                                            onChange={e => setEditFineFormData({ ...editFineFormData, motivo: e.target.value })}
                                                            className="w-full p-2 text-sm border rounded bg-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Monto</label>
                                                        <input
                                                            type="number"
                                                            value={editFineFormData.monto}
                                                            onChange={e => setEditFineFormData({ ...editFineFormData, monto: parseInt(e.target.value) })}
                                                            className="w-full p-2 text-sm border rounded bg-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Plazo</label>
                                                        <input
                                                            type="date"
                                                            value={editFineFormData.fechaVencimiento}
                                                            onChange={e => setEditFineFormData({ ...editFineFormData, fechaVencimiento: e.target.value })}
                                                            className="w-full p-2 text-sm border rounded bg-white"
                                                        />
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => {
                                                                updateMulta({ ...m, ...editFineFormData } as Multa);
                                                                setEditingMultaId(null);
                                                            }}
                                                            className="bg-green-600 text-white p-2 rounded hover:bg-green-700"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingMultaId(null)}
                                                            className="bg-slate-400 text-white p-2 rounded hover:bg-slate-500"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }

                                return (
                                    <tr key={m.id} className={`hover:bg-slate-50 transition ${isExpired ? 'bg-red-50/30' : ''}`}>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-slate-800">{new Date(m.fecha).toLocaleDateString()}</p>
                                            {m.fechaVencimiento && (
                                                <p className={`text-[10px] font-bold ${isExpired ? 'text-red-600' : 'text-slate-500'}`}>
                                                    Plazo: {new Date(m.fechaVencimiento).toLocaleDateString()}
                                                    {isExpired && ' (VENCIDA)'}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800">Vehículo #{m.vehiculoId}</span>
                                                <span className="text-[10px] bg-slate-100 text-slate-600 px-1 rounded w-fit font-bold uppercase">Dueño: {vehiculos.find(v => v.id === m.vehiculoId)?.propietario || 'No Reg.'}</span>
                                                <span className="text-[10px] text-slate-500 mt-1">Cond: {conductor?.nombre || m.conductorRut}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium">{m.motivo}</p>
                                            <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${m.tipo === 'vehiculo' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                {m.tipo}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-black text-slate-900">
                                            ${m.monto.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {m.pagada ? (
                                                <span className="text-green-600 font-bold text-xs flex items-center gap-1">
                                                    PAGADA ({new Date(m.fechaPago!).toLocaleDateString()})
                                                </span>
                                            ) : (
                                                <span className={`font-bold text-xs ${isExpired ? 'text-red-700' : 'text-red-600'}`}>
                                                    {isExpired ? 'EXPIRADA' : 'PENDIENTE'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {!m.pagada && (
                                                <>
                                                    <button
                                                        onClick={() => { if (confirm('¿Confirmar pago de esta multa?')) pagarMulta(m.id); }}
                                                        className="bg-slate-900 text-white text-[10px] font-bold px-3 py-1 rounded hover:bg-black transition"
                                                    >
                                                        PAGAR
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setEditingMultaId(m.id);
                                                            setEditFineFormData({
                                                                motivo: m.motivo,
                                                                monto: m.monto,
                                                                fechaVencimiento: m.fechaVencimiento || ''
                                                            });
                                                        }}
                                                        className="text-slate-400 hover:text-blue-600 p-1"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => { if (confirm('¿Eliminar registro de multa?')) removeMulta(m.id); }}
                                                className="text-slate-400 hover:text-red-600 p-1"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {multas.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center text-slate-400 italic">No hay registros de multas.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeAdminTab === 'vencimientos' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <h4 className="bg-slate-50 px-6 py-3 text-sm font-bold text-slate-700 border-b">Alertas de Vehículos</h4>
                        <table className="w-full text-left">
                            <thead className="text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b">
                                <tr>
                                    <th className="px-6 py-2">Vehículo</th>
                                    <th className="px-6 py-2">Documento</th>
                                    <th className="px-6 py-2">Vencimiento</th>
                                    <th className="px-6 py-2">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {vencimientosProximos.map(v => {
                                    const rtExpired = new Date(v.vencimientoRevisionTecnica) < new Date();
                                    const segExpired = new Date(v.vencimientoSeguro) < new Date();
                                    return (
                                        <React.Fragment key={v.id}>
                                            <tr className="hover:bg-slate-50">
                                                <td className="px-6 py-3">
                                                    <p className="font-bold text-sm">Línea #{v.id}</p>
                                                    <p className="text-[10px] text-slate-500">{v.patente}</p>
                                                </td>
                                                <td className="px-6 py-3 text-xs">Rev. Técnica</td>
                                                <td className={`px-6 py-3 text-xs font-bold ${rtExpired ? 'text-red-600' : 'text-slate-700'}`}>
                                                    {v.vencimientoRevisionTecnica}
                                                </td>
                                                <td className="px-6 py-3">
                                                    {rtExpired ? <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-black">VENCIDO</span> : <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-black">POR VENCER</span>}
                                                </td>
                                            </tr>
                                            <tr className="hover:bg-slate-50">
                                                <td className="px-6 py-3">
                                                    <p className="text-[10px] text-slate-400">Cupo: {v.propietario}</p>
                                                </td>
                                                <td className="px-6 py-3 text-xs">Seguro / SOAP</td>
                                                <td className={`px-6 py-3 text-xs font-bold ${segExpired ? 'text-red-600' : 'text-slate-700'}`}>
                                                    {v.vencimientoSeguro}
                                                </td>
                                                <td className="px-6 py-3">
                                                    {segExpired ? <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-black">VENCIDO</span> : <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-black">POR VENCER</span>}
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    )
                                })}
                                {vencimientosProximos.length === 0 && (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic text-sm">No hay vencimientos de vehículos próximos.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <h4 className="bg-slate-50 px-6 py-3 text-sm font-bold text-slate-700 border-b">Vencimientos de Licencia de Conducir</h4>
                        <table className="w-full text-left">
                            <thead className="text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b">
                                <tr>
                                    <th className="px-6 py-2">Conductor</th>
                                    <th className="px-6 py-2">Vencimiento</th>
                                    <th className="px-6 py-2">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {vencimientosConductores.map(c => {
                                    const expired = new Date(c.vencimientoLicencia) < new Date();
                                    return (
                                        <tr key={c.rut} className="hover:bg-slate-50">
                                            <td className="px-6 py-3">
                                                <p className="font-bold text-sm">{c.nombre}</p>
                                                <p className="text-[10px] text-slate-500">{c.rut}</p>
                                            </td>
                                            <td className={`px-6 py-3 text-xs font-bold ${expired ? 'text-red-600' : 'text-slate-700'}`}>
                                                {c.vencimientoLicencia}
                                            </td>
                                            <td className="px-6 py-3">
                                                {expired ? <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded font-black">VENCIDO</span> : <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-black">RENOVAR PRONTO</span>}
                                            </td>
                                        </tr>
                                    )
                                })}
                                {vencimientosConductores.length === 0 && (
                                    <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400 italic text-sm">Todos los conductores con licencia al día.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeAdminTab === 'auditoria' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Caja de Auditoría (Levantamientos Administrativos)</h3>
                            <p className="text-sm text-slate-500">Historial de desbloqueos manuales realizados por inspectores en terreno.</p>
                        </div>
                        <div className="relative w-64">
                            <input
                                type="text"
                                placeholder="Filtrar por vehículo o motivo..."
                                className="w-full pl-3 pr-10 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                                value={auditFilter}
                                onChange={e => setAuditFilter(e.target.value)}
                            />
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        </div>
                    </div>
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">Fecha y Hora</th>
                                <th className="px-6 py-4">Vehículo</th>
                                <th className="px-6 py-4">Inspector / Autor</th>
                                <th className="px-6 py-4">Motivo / Justificación</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredAuditoria.map(a => (
                                <tr key={a.id} className="hover:bg-slate-50 transition">
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {new Date(a.fecha).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-bold text-slate-800">#{a.vehiculoId}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-bold px-2 py-1 bg-slate-100 rounded text-slate-600">INSPECTOR_APP</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="bg-blue-50 p-2 rounded border border-blue-100 text-sm text-blue-800 italic">
                                            "{a.motivo}"
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredAuditoria.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-10 text-center text-slate-400 italic">No se encontraron registros que coincidan con la búsqueda.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeAdminTab === 'reportes' && (
                <div className="space-y-8">
                    {/* Reporte Diario */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <Download className="text-blue-500" size={24} />
                                    Reporte de Ventas Diarias
                                </h3>
                                <p className="text-slate-500 text-sm">Selecciona una fecha específica para exportar el detalle de ventas.</p>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <input 
                                    type="date" 
                                    value={selectedReportDate}
                                    onChange={(e) => setSelectedReportDate(e.target.value)}
                                    className="flex-1 md:w-48 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 transition-all"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => downloadDailyReport(selectedReportDate, 'csv')}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                                    >
                                        <FileCode size={14} />
                                        CSV
                                    </button>
                                    <button
                                        onClick={() => downloadDailyReport(selectedReportDate, 'xlsx')}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
                                    >
                                        <FileText size={14} />
                                        Excel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Historial Mensual */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Calendar className="text-orange-500" size={24} />
                                Reportes Mensuales (Folios)
                            </h3>
                            <p className="text-slate-500 text-sm">Resumen de folios por cupo para los últimos 12 meses.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {historicalMonths.map((date, idx) => {
                                const isCurrent = idx === 0;
                                return (
                                    <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between group hover:border-orange-200 hover:bg-orange-50/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${isCurrent ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-500'}`}>
                                            <Calendar size={20} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-700 capitalize">
                                                {date.toLocaleString('es-CL', { month: 'long', year: 'numeric' })}
                                            </p>
                                            {isCurrent && <span className="text-[10px] bg-orange-200 text-orange-700 px-1.5 py-0.5 rounded font-black uppercase">Mes Actual</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => downloadReport(date, 'csv')}
                                            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-orange-600 hover:border-orange-500 transition-all shadow-sm group-hover:shadow-md active:scale-95"
                                            title="Descargar CSV"
                                        >
                                            <FileCode size={18} />
                                        </button>
                                        <button
                                            onClick={() => downloadReport(date, 'xlsx')}
                                            className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:text-orange-600 hover:border-orange-500 transition-all shadow-sm group-hover:shadow-md active:scale-95"
                                            title="Descargar Excel"
                                        >
                                            <FileText size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            )}

            {activeAdminTab === 'impresion' && (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Calibración de Impresión (Pre-Impreso)</h3>
                            <p className="text-sm text-slate-500">Ajusta la posición (en píxeles) y tamaño de letra de los datos sobre el papel físico.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Controles */}
                        <div className="space-y-6">
                            {Object.keys(printSettings)
                                .filter(f => !['valor'].includes(f))
                                .map((field) => (
                                <div key={field} className="p-4 border rounded-lg bg-slate-50 space-y-3">
                                    <h4 className="font-bold text-sm uppercase text-slate-700 border-b pb-1 mb-2 italic">
                                        {field === 'folio' ? 'Número de Folio' :
                                            field === 'fechaEmision' ? 'Fecha de Emisión' :
                                                field === 'vehiculoId' ? 'ID Vehículo (Número)' :
                                                    field === 'patente' ? 'Patente Vehículo' :
                                                        field === 'controladorNombre' ? 'Nombre Controlador' :
                                                            field === 'controladorRut' ? 'RUT Controlador' :
                                                        field === 'fechaUso' ? 'Fecha de Uso' :
                                                            field === 'variacion' ? 'Ruta / Variación' : 'Nombre del Conductor'}
                                    </h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Superior (Top)</label>
                                            <input
                                                type="number"
                                                value={(printSettings as any)[field].top}
                                                onChange={(e) => updatePrintSettings(field as any, { top: parseInt(e.target.value) })}
                                                className="w-full border p-1 text-sm rounded"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Izquierda (Left)</label>
                                            <input
                                                type="number"
                                                value={(printSettings as any)[field].left}
                                                onChange={(e) => updatePrintSettings(field as any, { left: parseInt(e.target.value) })}
                                                className="w-full border p-1 text-sm rounded"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Talle (Size)</label>
                                            <input
                                                type="number"
                                                value={(printSettings as any)[field].fontSize}
                                                onChange={(e) => updatePrintSettings(field as any, { fontSize: parseInt(e.target.value) })}
                                                className="w-full border p-1 text-sm rounded"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Vista Previa Representativa */}
                        <div className="hidden lg:block">
                            <div className="sticky top-6 border-2 border-slate-300 rounded-lg p-2 bg-slate-200">
                                <div className="bg-white relative shadow-2xl overflow-hidden mx-auto" style={{ width: '400px', height: '300px' }}>
                                    <div className="absolute inset-0 opacity-10 flex items-center justify-center pointer-events-none">
                                        <p className="text-4xl font-black rotate-45 border-4 p-4 border-slate-800 uppercase">Pre-Impreso</p>
                                    </div>

                                    {/* Puntos de datos */}
                                    <span style={{ position: 'absolute', top: `${printSettings.folio.top}px`, left: `${printSettings.folio.left}px`, fontSize: `${printSettings.folio.fontSize}px`, fontWeight: 'bold' }}>1234</span>
                                    <span style={{ position: 'absolute', top: `${printSettings.fechaEmision.top}px`, left: `${printSettings.fechaEmision.left}px`, fontSize: `${printSettings.fechaEmision.fontSize}px` }}>25/12/2023</span>
                                    <span style={{ position: 'absolute', top: `${printSettings.vehiculoId.top}px`, left: `${printSettings.vehiculoId.left}px`, fontSize: `${printSettings.vehiculoId.fontSize}px`, fontWeight: '900' }}>500</span>
                                    <span style={{ position: 'absolute', top: `${printSettings.patente.top}px`, left: `${printSettings.patente.left}px`, fontSize: `${printSettings.patente.fontSize}px` }}>ABCD-12</span>
                                    <span style={{ position: 'absolute', top: `${printSettings.fechaUso.top}px`, left: `${printSettings.fechaUso.left}px`, fontSize: `${printSettings.fechaUso.fontSize}px`, fontWeight: 'bold' }}>26/12/2023</span>
                                    <span style={{ position: 'absolute', top: `${printSettings.variacion.top}px`, left: `${printSettings.variacion.left}px`, fontSize: `${printSettings.variacion.fontSize}px`, color: '#f97316', fontWeight: 'bold' }}>TRONCAL L</span>
                                    <span style={{ position: 'absolute', top: `${printSettings.conductor.top}px`, left: `${printSettings.conductor.left}px`, fontSize: `${printSettings.conductor.fontSize}px` }}>JUAN PEREZ</span>
                                    <span style={{ position: 'absolute', top: `${printSettings.controladorNombre.top}px`, left: `${printSettings.controladorNombre.left}px`, fontSize: `${printSettings.controladorNombre.fontSize}px` }}>CONTROLADOR: ANA GÓMEZ</span>
                                    <span style={{ position: 'absolute', top: `${printSettings.controladorRut.top}px`, left: `${printSettings.controladorRut.left}px`, fontSize: `${printSettings.controladorRut.fontSize}px` }}>RUT: 12.345.678-9</span>
                                </div>
                                <div className="mt-4 text-center text-[10px] text-slate-500 uppercase font-bold">
                                    Representación Visual (Escala Reducida)
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeAdminTab === 'rotacionR' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800">Planificación Variante R (Variante 1)</h3>
                            <p className="text-sm text-slate-500">Listado mensual de vehículos en rotación especial.</p>
                        </div>
                        <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
                            <button 
                                onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))}
                                className="p-2 hover:bg-white rounded-lg transition-all shadow-sm"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <span className="text-sm font-black uppercase min-w-[160px] text-center text-slate-700">
                                {calMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                            </span>
                            <button 
                                onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))}
                                className="p-2 hover:bg-white rounded-lg transition-all shadow-sm"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                        <button
                            onClick={handleGenerateMonthlyRotation}
                            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-orange-900/20 transition-all active:scale-95"
                        >
                            <Calendar size={18} />
                            Generar Plan Mensual
                        </button>
                        <button
                            onClick={() => {
                                if(window.confirm('¿Seguro que deseas limpiar TODA la planificación de este mes? Los inspectores no verán ningún auto en R.')) {
                                    const dCount = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
                                    const clearBatch: Record<string, number[]> = {};
                                    for(let i=1; i<=dCount; i++) {
                                        clearBatch[getLocalDateStr(new Date(calMonth.getFullYear(), calMonth.getMonth(), i))] = [];
                                    }
                                    batchUpdateAsignacionesR(clearBatch);
                                }
                            }}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-600 px-4 py-3 rounded-xl font-bold text-xs uppercase transition-all"
                        >
                            Limpiar Mes
                        </button>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                        {/* Listado Mensual */}
                        <div className="xl:col-span-3">
                            <div className="border rounded-2xl overflow-hidden shadow-sm bg-slate-50">
                                <div className="max-h-[700px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest z-20">
                                            <tr>
                                                <th className="px-6 py-4 border-r border-slate-700 w-24">Día</th>
                                                <th className="px-6 py-4 border-r border-slate-700 text-orange-400">Variante 1 - De Troncal</th>
                                                <th className="px-6 py-4 text-blue-400">Variante 1 - De Variante 2</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 bg-white">
                                            {(() => {
                                                const dCount = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
                                                const rows = [];
                                                for (let i = 1; i <= dCount; i++) {
                                                    const currentDayDate = new Date(calMonth.getFullYear(), calMonth.getMonth(), i);
                                                    const dStr = getLocalDateStr(currentDayDate);
                                                    const isSelected = dStr === selectedDateR;
                                                    const isToday = dStr === getLocalDateStr(new Date());
                                                    
                                                    const vehiclesOnR = asignacionesR[dStr] || vehiculos.filter(v => getDynamicVariacion(v.id, new Date(dStr + 'T12:00:00')) === 'R').map(v => v.id);
                                                    
                                                    const troncalR = vehiclesOnR.filter(id => {
                                                        const v = vehiculos.find(veh => veh.id === id);
                                                        return v?.rutaPrincipal === 'Troncal' || !v?.rutaPrincipal;
                                                    }).sort((a,b) => a-b);
                                                    
                                                    const variante2R = vehiclesOnR.filter(id => {
                                                        const v = vehiculos.find(veh => veh.id === id);
                                                        return v?.rutaPrincipal === 'Variante 2';
                                                    }).sort((a,b) => a-b);

                                                    rows.push(
                                                        <tr 
                                                            key={dStr} 
                                                            onClick={() => setSelectedDateR(dStr)}
                                                            className={`
                                                                cursor-pointer transition-all border-l-4
                                                                ${isSelected ? 'bg-orange-50 border-l-orange-500' : 'hover:bg-slate-50 border-l-transparent'}
                                                                ${isToday && !isSelected ? 'bg-blue-50/30' : ''}
                                                            `}
                                                        >
                                                            <td className="px-6 py-4">
                                                                <div className="flex flex-col">
                                                                    <span className={`text-lg font-black ${isToday ? 'text-orange-600' : 'text-slate-700'}`}>{i}</span>
                                                                    <span className="text-[10px] text-slate-400 uppercase font-black">
                                                                        {currentDayDate.toLocaleDateString('es-CL', { weekday: 'short' })}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 border-x border-slate-100">
                                                                <div className="flex flex-wrap gap-2">
                                                                    {troncalR.map(id => (
                                                                        <span key={id} className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-[11px] font-bold border border-orange-200 shadow-sm">#{id}</span>
                                                                    ))}
                                                                    {troncalR.length === 0 && <span className="text-slate-300 text-[10px] italic">Sin asignación</span>}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex flex-wrap gap-2">
                                                                    {variante2R.map(id => (
                                                                        <span key={id} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[11px] font-bold border border-blue-200 shadow-sm">#{id}</span>
                                                                    ))}
                                                                    {variante2R.length === 0 && <span className="text-slate-300 text-[10px] italic">Sin asignación</span>}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                                return rows;
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Panel de Edición Lateral */}
                        <div className="xl:col-span-1 space-y-6">
                            <div className="sticky top-6">
                                <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-xl overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                                        <Edit3 size={120} />
                                    </div>
                                    
                                    <h4 className="text-xs font-black text-orange-400 uppercase tracking-widest mb-1">Editor de Turno</h4>
                                    <h2 className="text-xl font-black mb-6 flex flex-col">
                                        <span>{new Date(selectedDateR + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long' })}</span>
                                        <span className="text-slate-400 text-sm">{new Date(selectedDateR + 'T12:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}</span>
                                    </h2>
                                    
                                    <div className="space-y-4 relative z-10">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase mb-2">IDs en R (separar por coma)</label>
                                            <textarea
                                                className="w-full bg-slate-800 border-2 border-slate-700 rounded-xl p-4 text-orange-400 font-mono text-sm outline-none focus:border-orange-500 transition-all placeholder:text-slate-600"
                                                rows={5}
                                                value={editRText}
                                                onChange={(e) => setEditRText(e.target.value)}
                                                placeholder="Ej: 101, 102, 103..."
                                            />
                                        </div>
                                        
                                        <button
                                            onClick={() => {
                                                const ids = editRText.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
                                                updateAsignacionesR(selectedDateR, ids);
                                                alert('Turno actualizado correctamente.');
                                            }}
                                            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-black py-4 rounded-xl transition-all shadow-lg shadow-orange-900/40 uppercase text-xs tracking-widest"
                                        >
                                            Guardar Plan
                                        </button>
                                        
                                        <button
                                            onClick={() => {
                                                if(window.confirm('¿Deseas volver a la rotación automática para este día?')) {
                                                    updateAsignacionesR(selectedDateR, null);
                                                }
                                            }}
                                            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-3 rounded-xl transition-all uppercase text-[10px] tracking-widest"
                                        >
                                            Restaurar Automático
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="mt-6 p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest text-center">Leyenda</h4>
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <div className="w-4 h-4 rounded bg-orange-100 border border-orange-200 mt-0.5" />
                                            <p className="text-[10px] text-slate-500 leading-tight">Vehículos cuya ruta base es <strong>Troncal</strong> pasando a R.</p>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200 mt-0.5" />
                                            <p className="text-[10px] text-slate-500 leading-tight">Vehículos cuya ruta base es <strong>Variante 2</strong> pasando a R.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeAdminTab === 'calendario' && (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-8 border-b pb-4">
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Calendar className="text-orange-500" size={24} />
                                Gestión de Días No Hábiles (Feriados)
                            </h3>
                            <p className="text-sm text-slate-500">Marca los días en los que NO se deben emitir tarjetas de ruta.</p>
                        </div>
                    </div>

                    <div className="max-w-md mx-auto bg-slate-50 p-6 rounded-2xl border border-slate-200">
                        {(() => {
                            const daysCount = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
                            const days = [];
                            for (let i = 1; i <= daysCount; i++) {
                                days.push(getLocalDateStr(new Date(calMonth.getFullYear(), calMonth.getMonth(), i)));
                            }

                            const firstDay = (new Date(calMonth.getFullYear(), calMonth.getMonth(), 1).getDay() + 6) % 7;

                            return (
                                <>
                                    <div className="flex justify-between items-center mb-6">
                                        <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() - 1, 1))} className="p-2 hover:bg-white rounded-full transition shadow-sm"><ChevronLeft size={20} /></button>
                                        <span className="text-lg font-black uppercase text-slate-700">{calMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
                                        <button onClick={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 1))} className="p-2 hover:bg-white rounded-full transition shadow-sm"><ChevronRight size={20} /></button>
                                    </div>

                                    <div className="grid grid-cols-7 gap-2 text-center mb-4">
                                        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(d => <span key={d} className="text-xs font-black text-slate-400">{d}</span>)}
                                    </div>

                                    <div className="grid grid-cols-7 gap-2">
                                        {Array.from({ length: firstDay }).map((_, i) => <div key={`p-${i}`} />)}
                                        {days.map(dStr => {
                                            const isNonWork = diasNoHabiles.includes(dStr);
                                            const isToday = dStr === getLocalDateStr(new Date());
                                            const dayNum = parseInt(dStr.split('-')[2]);

                                            return (
                                                <button
                                                    key={dStr}
                                                    onClick={() => toggleDiaNoHabil(dStr)}
                                                    className={`
                                                        h-12 rounded-xl text-sm font-bold transition-all
                                                        ${isNonWork ? 'bg-red-500 text-white shadow-lg shadow-red-200 scale-105' : 
                                                          isToday ? 'bg-white border-2 border-orange-400 text-orange-600' :
                                                          'bg-white hover:bg-orange-50 text-slate-600 border border-slate-100'}
                                                    `}
                                                >
                                                    {dayNum}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-8 flex flex-col gap-2 p-4 bg-white rounded-xl border border-slate-100 italic text-[11px] text-slate-400">
                                        <div className="flex items-center gap-2 font-bold mb-1"><div className="w-3 h-3 bg-red-500 rounded" /> Rojo: Días bloqueados (No hábiles)</div>
                                        <p>Los días en rojo no permitirán al inspector emitir tarjetas.</p>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {activeAdminTab === 'archivados' && (
                <div className="space-y-8">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800">Vehículos Archivados (Baja Lógica)</h3>
                            <span className="text-xs font-black text-slate-500 uppercase">{vehiculosArchivados.length} registros</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-[10px] font-black text-slate-400 uppercase border-b bg-white">
                                    <tr>
                                        <th className="px-6 py-3">Cupo</th>
                                        <th className="px-6 py-3">Patente</th>
                                        <th className="px-6 py-3">Propietario</th>
                                        <th className="px-6 py-3">Fecha Baja</th>
                                        <th className="px-6 py-3 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {vehiculosArchivados.map(v => (
                                        <tr key={v.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 font-black text-slate-800">#{v.id}</td>
                                            <td className="px-6 py-4 text-xs font-mono text-slate-600">{v.patente}</td>
                                            <td className="px-6 py-4 text-sm text-slate-700">{v.propietario}</td>
                                            <td className="px-6 py-4 text-xs text-slate-500">{v.fechaEliminacion ? new Date(v.fechaEliminacion).toLocaleString() : '-'}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => restoreVehiculo(v.id)}
                                                    className="bg-green-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg hover:bg-green-700 transition"
                                                >
                                                    Reactivar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {vehiculosArchivados.length === 0 && (
                                        <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic text-sm">No hay vehículos archivados.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between">
                            <h3 className="font-bold text-slate-800">Conductores Archivados (Baja Lógica)</h3>
                            <span className="text-xs font-black text-slate-500 uppercase">{conductoresArchivados.length} registros</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="text-[10px] font-black text-slate-400 uppercase border-b bg-white">
                                    <tr>
                                        <th className="px-6 py-3">Nombre</th>
                                        <th className="px-6 py-3">RUT</th>
                                        <th className="px-6 py-3">Fecha Baja</th>
                                        <th className="px-6 py-3 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {conductoresArchivados.map(c => (
                                        <tr key={c.rut} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 text-sm font-bold text-slate-800">{c.nombre}</td>
                                            <td className="px-6 py-4 text-xs font-mono text-slate-600">{c.rut}</td>
                                            <td className="px-6 py-4 text-xs text-slate-500">{c.fechaEliminacion ? new Date(c.fechaEliminacion).toLocaleString() : '-'}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => restoreConductor(c.rut)}
                                                    className="bg-green-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg hover:bg-green-700 transition"
                                                >
                                                    Reactivar
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {conductoresArchivados.length === 0 && (
                                        <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 italic text-sm">No hay conductores archivados.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const StatCard: React.FC<{ title: string, value: string, icon: any, color: string, onClick?: () => void }> = ({ title, value, icon: Icon, color, onClick }) => {
    const colors: Record<string, string> = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        orange: 'bg-orange-50 text-orange-600',
        purple: 'bg-purple-50 text-purple-600',
    };

    return (
        <div 
            onClick={onClick}
            className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:border-blue-400 hover:shadow-md transition-all active:scale-95' : ''}`}
        >
            <div className={`p-4 rounded-xl ${colors[color]}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500">{title}</p>
                <p className="text-2xl font-bold text-slate-800">{value}</p>
            </div>
        </div>
    );
};

export default AdminDashboard;
