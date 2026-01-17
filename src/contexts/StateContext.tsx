import React, { createContext, useContext, useState, useEffect } from 'react';
import type { 
  Vehiculo, Conductor, TarjetaRuta, Multa, VariacionRuta,
  AuditoriaDesbloqueo, PrintSettings 
} from '../types';

interface StateContextType {
  vehiculos: Vehiculo[];
  conductores: Conductor[];
  tarjetas: TarjetaRuta[];
  multas: Multa[];
  auditoriaDesbloqueos: AuditoriaDesbloqueo[];
  addVehiculo: (v: Vehiculo) => void;
  updateVehiculo: (v: Vehiculo) => void;
  removeVehiculo: (id: number) => void;
  addConductor: (c: Conductor) => void;
  updateConductor: (c: Conductor) => void;
  removeConductor: (rut: string) => void;
  venderTarjeta: (vehiculoId: number, fechasUso?: string[]) => { success: boolean; message: string; cards?: TarjetaRuta[] };
  getMonthlyBalance: (vehiculoId: number) => number;
  getDynamicVariacion: (vehiculoId: number, baseDate?: Date) => VariacionRuta;
  registrarPago: (vehiculoId: number, monto: number, tipo: 'deuda' | 'multa') => void;
  registrarMulta: (vehiculoId: number, conductorRut: string, monto: number, motivo: string, tipo: 'vehiculo' | 'conductor', fechaVencimiento?: string) => void;
  updateMulta: (m: Multa) => void;
  removeMulta: (id: number) => void;
  pagarMulta: (multaId: number) => void;
  levantarBloqueoTemporal: (vehiculoId: number, motivo: string) => void;
  printSettings: PrintSettings;
  updatePrintSettings: (field: keyof PrintSettings, values: Partial<{ top: number, left: number, fontSize: number }>) => void;
  diasNoHabiles: string[];
  toggleDiaNoHabil: (fecha: string) => void;
}

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  folio: { top: 20, left: 350, fontSize: 18 },
  fechaEmision: { top: 45, left: 350, fontSize: 12 },
  fechaUso: { top: 120, left: 160, fontSize: 18 },
  vehiculoId: { top: 120, left: 20, fontSize: 24 },
  patente: { top: 155, left: 20, fontSize: 14 },
  conductor: { top: 120, left: 250, fontSize: 14 },
  variacion: { top: 155, left: 160, fontSize: 14 },
  valor: { top: 120, left: 380, fontSize: 24 },
};

const StateContext = createContext<StateContextType | undefined>(undefined);

const INITIAL_VEHICULOS: Vehiculo[] = [
  { 
    id: 101, 
    propietario: 'Don Pedro',
    patente: 'AA-BB-11', 
    modelo: 'Toyota Yaris', 
    anio: 2022, 
    vencimientoRevisionTecnica: '2026-05-20', 
    vencimientoSeguro: '2026-03-15', 
    bloqueado: false,
    rutaPrincipal: 'Troncal',
    variacionRuta: 'Normal',
    estadoCuenta: { deudas: 0, multas: 0 }
  },
  { 
    id: 102, 
    propietario: 'Doña María',
    patente: 'CC-DD-22', 
    modelo: 'Hyundai Accent', 
    anio: 2021, 
    vencimientoRevisionTecnica: '2026-06-15', 
    vencimientoSeguro: '2026-04-10', 
    bloqueado: true, 
    motivoBloqueo: 'Multas pendientes',
    rutaPrincipal: 'Variante',
    variacionRuta: 'L',
    estadoCuenta: { deudas: 25000, multas: 15000 }
  },
];

const INITIAL_CONDUCTORES: Conductor[] = [
  { 
    rut: '12.345.678-9', 
    nombre: 'Juan Pérez', 
    vencimientoLicencia: '2027-10-12', 
    vehiculoId: 101, 
    bloqueado: false,
    historialVehiculos: [
      { id: 'h1', vehiculoId: 101, conductorRut: '12.345.678-9', fechaInicio: '2023-01-01' }
    ]
  },
  { 
    rut: '98.765.432-1', 
    nombre: 'Diego Soto', 
    vencimientoLicencia: '2025-01-10', 
    vehiculoId: 102, 
    bloqueado: true, 
    motivoBloqueo: 'Licencia vencida',
    historialVehiculos: [
      { id: 'h2', vehiculoId: 102, conductorRut: '98.765.432-1', fechaInicio: '2023-05-15' }
    ]
  },
];

export const StateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>(() => {
    try {
      const saved = localStorage.getItem('vehiculos');
      if (saved && saved !== 'undefined') {
        const parsed = JSON.parse(saved);
        return parsed.map((v: any) => ({
          ...v,
          propietario: v.propietario || 'Propietario no registrado',
          rutaPrincipal: v.rutaPrincipal || 'Troncal',
          variacionRuta: v.variacionRuta || 'Normal',
          estadoCuenta: v.estadoCuenta || { deudas: 0, multas: 0 }
        }));
      }
      return INITIAL_VEHICULOS;
    } catch { return INITIAL_VEHICULOS; }
  });

  const [conductores, setConductores] = useState<Conductor[]>(() => {
    try {
      const saved = localStorage.getItem('conductores');
      if (saved && saved !== 'undefined') {
        const parsed = JSON.parse(saved);
        // DEDUPLICACIÓN DE EMERGENCIA: Limpia duplicados accidentales por RUT
        const uniqueMap = new Map();
        parsed.forEach((c: any) => {
          if (!uniqueMap.has(c.rut) || (c.vehiculoId && !uniqueMap.get(c.rut).vehiculoId)) {
            uniqueMap.set(c.rut, c);
          }
        });
        return Array.from(uniqueMap.values()).map((c: any) => ({
          ...c,
          bloqueado: c.bloqueado ?? false
        }));
      }
      return INITIAL_CONDUCTORES;
    } catch { return INITIAL_CONDUCTORES; }
  });

  const [tarjetas, setTarjetas] = useState<TarjetaRuta[]>(() => {
    try {
      const saved = localStorage.getItem('tarjetas');
      return saved && saved !== 'undefined' ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [multas, setMultas] = useState<Multa[]>(() => {
    try {
      const saved = localStorage.getItem('multas');
      return saved && saved !== 'undefined' ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [auditoriaDesbloqueos, setAuditoriaDesbloqueos] = useState<AuditoriaDesbloqueo[]>(() => {
    try {
      const saved = localStorage.getItem('auditoria_desbloqueos');
      return saved && saved !== 'undefined' ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [printSettings, setPrintSettings] = useState<PrintSettings>(() => {
    try {
      const saved = localStorage.getItem('print_settings');
      return saved && saved !== 'undefined' ? JSON.parse(saved) : DEFAULT_PRINT_SETTINGS;
    } catch { return DEFAULT_PRINT_SETTINGS; }
  });

  const updatePrintSettings = (field: keyof PrintSettings, values: any) => {
    setPrintSettings(prev => ({
      ...prev,
      [field]: { ...prev[field], ...values }
    }));
  };

  const [diasNoHabiles, setDiasNoHabiles] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('dias_no_habiles');
      return saved && saved !== 'undefined' ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const toggleDiaNoHabil = (fecha: string) => {
    setDiasNoHabiles(prev => 
      prev.includes(fecha) ? prev.filter(d => d !== fecha) : [...prev, fecha]
    );
  };

  useEffect(() => {
    localStorage.setItem('vehiculos', JSON.stringify(vehiculos));
  }, [vehiculos]);

  useEffect(() => {
    localStorage.setItem('conductores', JSON.stringify(conductores));
  }, [conductores]);

  useEffect(() => {
    localStorage.setItem('tarjetas', JSON.stringify(tarjetas));
  }, [tarjetas]);

  useEffect(() => {
    localStorage.setItem('multas', JSON.stringify(multas));
  }, [multas]);

  useEffect(() => {
    localStorage.setItem('auditoria_desbloqueos', JSON.stringify(auditoriaDesbloqueos));
  }, [auditoriaDesbloqueos]);

  useEffect(() => {
    localStorage.setItem('print_settings', JSON.stringify(printSettings));
  }, [printSettings]);

  useEffect(() => {
    localStorage.setItem('dias_no_habiles', JSON.stringify(diasNoHabiles));
  }, [diasNoHabiles]);

  const addVehiculo = (v: Vehiculo) => setVehiculos([...vehiculos, v]);
  const updateVehiculo = (v: Vehiculo) => setVehiculos(vehiculos.map(it => it.id === v.id ? v : it));
  const removeVehiculo = (id: number) => setVehiculos(vehiculos.filter(v => v.id !== id));

  const addConductor = (c: Conductor) => {
    setConductores(prev => {
      // PREVENCIÓN DE DUPLICADOS: Si el RUT ya existe, no agregamos uno nuevo
      if (prev.some(old => old.rut === c.rut)) {
        return prev.map(old => old.rut === c.rut ? { ...old, ...c } : old);
      }

      // 1. Si se asigna a un vehículo, desvincular a otros que lo tengan
      let nextBase = prev;
      if (c.vehiculoId) {
        nextBase = nextBase.map(old => {
          if (old.vehiculoId === c.vehiculoId) {
            const history = [...(old.historialVehiculos || [])];
            if (history.length > 0) {
              const lastIdx = history.length - 1;
              if (!history[lastIdx].fechaFin) {
                history[lastIdx].fechaFin = new Date().toISOString();
              }
            }
            return { ...old, vehiculoId: undefined, historialVehiculos: history };
          }
          return old;
        });
      }

      const freshConductor = {
        ...c,
        historialVehiculos: c.vehiculoId ? [{
          id: crypto.randomUUID(),
          vehiculoId: c.vehiculoId,
          conductorRut: c.rut,
          fechaInicio: new Date().toISOString()
        }] : []
      };

      return [...nextBase, freshConductor];
    });
  };

  const updateConductor = (updated: Conductor) => {
    setConductores(prev => {
      // 1. If assigned to a vehicle, unbind others
      let next = prev;
      if (updated.vehiculoId) {
        next = next.map(c => {
          if (c.rut !== updated.rut && c.vehiculoId === updated.vehiculoId) {
            // This conductor was in the target vehicle, unbind them
            const history = [...(c.historialVehiculos || [])];
            if (history.length > 0) {
              const lastIdx = history.length - 1;
              if (!history[lastIdx].fechaFin) {
                history[lastIdx].fechaFin = new Date().toISOString();
              }
            }
            return { ...c, vehiculoId: undefined, historialVehiculos: history };
          }
          return c;
        });
      }

      // 2. Update the target conductor
      return next.map(old => {
        if (old.rut !== updated.rut) return old;

        // Detect vehicle change
        if (old.vehiculoId !== updated.vehiculoId) {
          const history = [...(old.historialVehiculos || [])];
          
          // Close last assignment if it existed
          if (old.vehiculoId && history.length > 0) {
            const lastIdx = history.length - 1;
            if (!history[lastIdx].fechaFin) {
              history[lastIdx].fechaFin = new Date().toISOString();
            }
          }

          // Open new assignment
          if (updated.vehiculoId) {
            history.push({
              id: crypto.randomUUID(),
              vehiculoId: updated.vehiculoId,
              conductorRut: updated.rut,
              fechaInicio: new Date().toISOString()
            });
          }

          return { ...updated, historialVehiculos: history };
        }

        return updated;
      });
    });
  };
  const removeConductor = (rut: string) => {
    // Optionally we could keep them in a "soft delete" or just remove them.
    // But since history is tied to the conductor object, removing them loses their history.
    // For now, let's just remove them as per existing logic, but maybe we should close the assignment.
    setConductores(prev => prev.filter(c => c.rut !== rut));
  };

  const venderTarjeta = (vehiculoId: number, fechasUso?: string[]) => {
    const vehiculo = vehiculos.find(v => v.id === vehiculoId);
    if (!vehiculo) return { success: false, message: 'Vehículo no encontrado' };

    const conductor = conductores.find(c => c.vehiculoId === vehiculoId);
    if (!conductor) return { success: false, message: 'No hay conductor asociado a este vehículo' };

    // Validar Bloqueos
    if ((vehiculo.bloqueado || conductor.bloqueado) && !vehiculo.desbloqueoTemporal?.activo) {
      return { success: false, message: 'Venta bloqueada por administración.' };
    }

    // Validar Licencia Vencida
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fechaLicencia = new Date(conductor.vencimientoLicencia + 'T12:00:00');
    if (fechaLicencia < hoy && !vehiculo.desbloqueoTemporal?.activo) {
      return { success: false, message: `Bloqueado: Licencia del conductor (${conductor.nombre}) venció el ${conductor.vencimientoLicencia}.` };
    }

    const multasVencidas = multas.filter(m => 
      m.vehiculoId === vehiculoId && !m.pagada && m.fechaVencimiento && new Date(m.fechaVencimiento) < new Date()
    );

    if (multasVencidas.length > 0 && !vehiculo.desbloqueoTemporal?.activo) {
      return { success: false, message: `Bloqueado por ${multasVencidas.length} multas vencidas.` };
    }

    // Si no se pasan fechas, se asume el día de hoy (comportamiento anterior si no se actualiza el componente)
    const targetDates = fechasUso || [new Date().toISOString().split('T')[0]];
    
    // Evitar duplicados para seguridad aunque el front lo prevenga
    const alreadySold = targetDates.some(d => 
      tarjetas.some(t => t.vehiculoId === vehiculoId && t.fechaUso?.split('T')[0] === d)
    );

    if (alreadySold) return { success: false, message: 'Una o más fechas ya tienen una tarjeta emitida.' };

    const nuevasTarjetas: TarjetaRuta[] = targetDates.map((dateStr, i) => {
      const fechaUsoDate = new Date(dateStr + 'T12:00:00'); // Usar mediodía para evitar desfases de zona horaria
      const variacionParaEseDia = getDynamicVariacion(vehiculoId, fechaUsoDate);

      return {
        id: Date.now() + i,
        folio: `F-${Math.floor(1000 + Math.random() * 9000)}-${vehiculoId}`,
        vehiculoId,
        nombreConductor: conductor.nombre,
        fechaEmision: new Date().toISOString(),
        fechaUso: fechaUsoDate.toISOString(),
        variacion: variacionParaEseDia,
        valor: 2500
      };
    });

    setTarjetas(prev => [...prev, ...nuevasTarjetas]);
    
    const totalVenta = 2500 * targetDates.length;
    setVehiculos(prev => prev.map(v => 
      v.id === vehiculoId 
        ? { 
            ...v, 
            estadoCuenta: { 
              ...v.estadoCuenta, 
              deudas: Math.max(0, v.estadoCuenta.deudas - totalVenta) 
            },
            desbloqueoTemporal: undefined 
          } 
        : v
    ));

    return { 
      success: true, 
      message: `${targetDates.length} tarjeta(s) vendida(s) con éxito.`,
      cards: nuevasTarjetas 
    };
  };

  const getMonthlyBalance = (vehiculoId: number) => {
    const BASE_MONTHLY = 62500;
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const monthTarjetas = tarjetas.filter(t => {
      const d = new Date(t.fechaEmision);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && t.vehiculoId === vehiculoId;
    });

    const paidSoFar = monthTarjetas.length * 2500;
    return BASE_MONTHLY - paidSoFar;
  };

  const getDynamicVariacion = (vehiculoId: number, baseDate?: Date): VariacionRuta => {
    const today = baseDate || new Date();
    
    // 1. Lógica para variación "R" (Rotativa por sorteo/día)
    const epoch = new Date(2024, 0, 1);
    const diffTime = Math.abs(today.getTime() - epoch.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    const totalGroups = 28; 
    const groupToday = diffDays % totalGroups;

    let isRDay = false;
    if (groupToday === 0) {
      isRDay = vehiculoId >= 1 && vehiculoId <= 6;
    } else {
      const start = 6 + (groupToday - 1) * 9 + 1;
      const end = (groupToday === totalGroups - 1) ? 250 : 6 + groupToday * 9;
      isRDay = vehiculoId >= start && vehiculoId <= end;
    }

    if (isRDay) return 'R';

    // 2. Lógica Mensual (Normal vs L)
    return (today.getMonth() % 2 === 0) ? 'L' : 'Normal';
  };

  const registrarPago = (vehiculoId: number, monto: number, tipo: 'deuda' | 'multa') => {
    setVehiculos(prev => prev.map(v => {
      if (v.id !== vehiculoId) return v;
      return {
        ...v,
        estadoCuenta: {
          ...v.estadoCuenta,
          [tipo === 'deuda' ? 'deudas' : 'multas']: Math.max(0, v.estadoCuenta[tipo === 'deuda' ? 'deudas' : 'multas'] - monto)
        }
      };
    }));
  };

  const registrarMulta = (vehiculoId: number, conductorRut: string, monto: number, motivo: string, tipo: 'vehiculo' | 'conductor', fechaVencimiento?: string) => {
    const nuevaMulta: Multa = {
      id: Date.now(),
      vehiculoId,
      conductorRut,
      monto,
      motivo,
      tipo,
      fecha: new Date().toISOString(),
      fechaVencimiento,
      pagada: false
    };

    setMultas(prev => [...prev, nuevaMulta]);

    setVehiculos(prev => prev.map(v => {
      if (v.id !== vehiculoId) return v;
      return {
        ...v,
        estadoCuenta: {
          ...v.estadoCuenta,
          multas: v.estadoCuenta.multas + monto
        }
      };
    }));
  };

  const updateMulta = (updated: Multa) => {
    const old = multas.find(m => m.id === updated.id);
    if (!old) return;

    setMultas(prev => prev.map(m => m.id === updated.id ? updated : m));

    // Si cambió el monto o el estado de pago, actualizamos el estadoCuenta del vehículo
    if (old.monto !== updated.monto || old.pagada !== updated.pagada || old.vehiculoId !== updated.vehiculoId) {
      setVehiculos(prev => prev.map(v => {
        let newMultasBalance = v.estadoCuenta.multas;
        
        // Si el vehículo era el dueño de la multa vieja, restamos el monto viejo si no estaba pagada
        if (v.id === old.vehiculoId && !old.pagada) {
          newMultasBalance -= old.monto;
        }

        // Si el vehículo es el dueño de la multa nueva, sumamos el monto nuevo si no está pagada
        if (v.id === updated.vehiculoId && !updated.pagada) {
          newMultasBalance += updated.monto;
        }

        return {
          ...v,
          estadoCuenta: {
            ...v.estadoCuenta,
            multas: Math.max(0, newMultasBalance)
          }
        };
      }));
    }
  };

  const removeMulta = (id: number) => {
    const multa = multas.find(m => m.id === id);
    if (!multa) return;

    setMultas(prev => prev.filter(m => m.id !== id));

    if (!multa.pagada) {
      setVehiculos(prev => prev.map(v => {
        if (v.id !== multa.vehiculoId) return v;
        return {
          ...v,
          estadoCuenta: {
            ...v.estadoCuenta,
            multas: Math.max(0, v.estadoCuenta.multas - multa.monto)
          }
        };
      }));
    }
  };

  const pagarMulta = (multaId: number) => {
    const multa = multas.find(m => m.id === multaId);
    if (!multa || multa.pagada) return;

    setMultas(prev => prev.map(m => m.id === multaId ? { ...m, pagada: true, fechaPago: new Date().toISOString() } : m));
    
    setVehiculos(prev => prev.map(v => {
      if (v.id !== multa.vehiculoId) return v;
      return {
        ...v,
        estadoCuenta: {
          ...v.estadoCuenta,
          multas: Math.max(0, v.estadoCuenta.multas - multa.monto)
        }
      };
    }));
  };

  const levantarBloqueoTemporal = (vehiculoId: number, motivo: string) => {
    const nuevoRegistro: AuditoriaDesbloqueo = {
      id: Date.now(),
      vehiculoId,
      motivo,
      fecha: new Date().toISOString()
    };

    setAuditoriaDesbloqueos(prev => [...prev, nuevoRegistro]);

    setVehiculos(prev => prev.map(v => 
      v.id === vehiculoId 
        ? { 
            ...v, 
            desbloqueoTemporal: { 
              activo: true, 
              motivo, 
              fecha: new Date().toISOString() 
            } 
          } 
        : v
    ));
  };

  return (
    <StateContext.Provider value={{
      vehiculos, conductores, tarjetas, multas, auditoriaDesbloqueos,
      addVehiculo, updateVehiculo, removeVehiculo,
      addConductor, updateConductor, removeConductor,
      venderTarjeta, getMonthlyBalance, getDynamicVariacion,
      registrarPago, registrarMulta, updateMulta, removeMulta, pagarMulta,
      levantarBloqueoTemporal,
      printSettings,
      updatePrintSettings,
      diasNoHabiles,
      toggleDiaNoHabil
    }}>
      {children}
    </StateContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StateContext);
  if (!context) throw new Error('useStore must be used within StateProvider');
  return context;
};
