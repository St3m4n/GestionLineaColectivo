export interface Vehiculo {
  id: number;
  propietario: string;
  patente: string;
  modelo: string;
  anio: number;
  vencimientoRevisionTecnica: string;
  vencimientoSeguro: string;
  bloqueado: boolean;
  motivoBloqueo?: string;
  rutaPrincipal: 'Troncal' | 'Variante 2';
  variacionRuta: 'T' | 'L' | 'R' | 'Normal' | 'V2';
  estadoCuenta: {
    deudas: number;
    multas: number;
  };
  desbloqueoTemporal?: {
    activo: boolean;
    motivo: string;
    fecha: string;
  };
  eliminado?: boolean;
  fechaEliminacion?: string;
}

export interface HistorialAsignacion {
  id: string;
  vehiculoId: number;
  conductorRut: string;
  fechaInicio: string;
  fechaFin?: string;
}

export interface Conductor {
  rut: string;
  nombre: string;
  vencimientoLicencia: string;
  vehiculoId?: number;
  bloqueado: boolean;
  motivoBloqueo?: string;
  historialVehiculos?: HistorialAsignacion[];
  agregadoPorInspector?: boolean;
  eliminado?: boolean;
  fechaEliminacion?: string;
}

export interface Controlador {
  nombre: string;
  rut: string;
  telefono?: string;
  email?: string;
  observaciones?: string;
}

export interface Multa {
  id: number;
  vehiculoId: number;
  conductorRut: string;
  motivo: string;
  monto: number;
  fecha: string;
  fechaVencimiento?: string;
  tipo: 'vehiculo' | 'conductor';
  pagada: boolean;
  fechaPago?: string;
}

export interface AuditoriaDesbloqueo {
  id: number;
  vehiculoId: number;
  motivo: string;
  fecha: string;
}

export interface AuditoriaAsignacion {
  id: string;
  vehiculoId: number;
  conductorRut: string;
  conductorNombre: string;
  fecha: string;
  tipo: 'cambio' | 'nuevo';
  realizadoPor: 'administrador' | 'inspector';
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
  controladorNombre: PrintPosition;
  controladorRut: PrintPosition;
  variacion: PrintPosition;
  valor: PrintPosition;
}

export interface VentaTarjeta {
  id: number;
  folio: string;
  vehiculoId: number;
  fechaEmision: string;
  fechaUso: string;
  valor: number;
  nombreConductor: string;
  variacion: 'T' | 'L' | 'R' | 'Normal' | 'V2';
}

export interface CrearVentaPayload {
  vehiculoId: number;
  fechasUso?: string[];
}

export interface FullState {
  vehiculos: Vehiculo[];
  conductores: Conductor[];
  tarjetas: VentaTarjeta[];
  multas: Multa[];
  controlador: Controlador | null;
  auditoriaDesbloqueos: AuditoriaDesbloqueo[];
  auditoriaAsignaciones: AuditoriaAsignacion[];
  printSettings: PrintSettings;
  diasNoHabiles: string[];
  asignacionesR: Record<string, number[]>;
}