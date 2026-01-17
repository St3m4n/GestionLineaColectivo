export type RutaPrincipal = 'Troncal' | 'Variante';
export type VariacionRuta = 'Normal' | 'L' | 'R';

export interface Vehiculo {
  id: number; // Número de línea/cupo (1-250)
  propietario: string; // Nombre del dueño del cupo
  patente: string;
  modelo: string;
  anio: number;
  vencimientoRevisionTecnica: string; // ISO date
  vencimientoSeguro: string; // ISO date
  bloqueado: boolean;
  motivoBloqueo?: string;
  rutaPrincipal: RutaPrincipal;
  variacionRuta: VariacionRuta;
  estadoCuenta: {
    deudas: number;
    multas: number;
  };
  desbloqueoTemporal?: {
    activo: boolean;
    motivo: string;
    fecha: string; // ISO date de cuándo se levantó
  };
  historialConductores?: HistorialAsignacion[];
}

export interface HistorialAsignacion {
  id: string;
  vehiculoId: number;
  conductorRut: string;
  fechaInicio: string;
  fechaFin?: string;
}

export interface AuditoriaDesbloqueo {
  id: number;
  vehiculoId: number;
  motivo: string;
  fecha: string;
}

export interface Conductor {
  rut: string;
  nombre: string;
  vencimientoLicencia: string; // ISO date
  vehiculoId?: number; // ID de línea asociado
  bloqueado: boolean;
  motivoBloqueo?: string;
  historialVehiculos?: HistorialAsignacion[];
}

export interface TarjetaRuta {
  id: number;
  folio: string;
  vehiculoId: number;
  nombreConductor: string;
  fechaEmision: string; // ISO date
  fechaUso?: string;    // ISO date para el día que corresponde (prepago)
  variacion: VariacionRuta;
  valor: number; // Pretermindado $2500
}

export interface Multa {
  id: number;
  vehiculoId: number;
  conductorRut: string;
  motivo: string;
  monto: number;
  fecha: string;
  fechaVencimiento?: string; // ISO date para el plazo de pago
  tipo: 'vehiculo' | 'conductor';
  pagada: boolean;
  fechaPago?: string;
}

export interface Venta {
  id: string;
  vehiculoId: number;
  fechaEmision: string; // Cuándo se pagó
  fechaUso: string;    // Día para el que es válida la tarjeta (YYYY-MM-DD)
  monto: number;
}

export interface PrintPosition {
  top: number;
  left: number;
  fontSize: number;
}

export interface PrintSettings {
  folio: PrintPosition;
  fechaEmision: PrintPosition;
  fechaUso: PrintPosition;
  vehiculoId: PrintPosition;
  patente: PrintPosition;
  conductor: PrintPosition;
  variacion: PrintPosition;
  valor: PrintPosition;
}
