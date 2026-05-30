export interface Employee {
  id: string;
  empCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  dateOfJoining: string;
  status: 'active' | 'on_leave' | 'terminated' | 'probation';
  salary: number;
  bankAccount: string;
  pan: string;
  aadhaar: string;
  pfNumber: string;
  esiNumber: string;
  reportingTo: string;
  shift: string;
  avatar?: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  punchIn: string | null;
  punchOut: string | null;
  status: 'present' | 'absent' | 'half_day' | 'late' | 'on_leave' | 'holiday' | 'week_off';
  hoursWorked: number;
  location: string;
  method: 'biometric' | 'geo' | 'manual' | 'mobile';
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: 'CL' | 'SL' | 'EL' | 'ML' | 'CO' | 'LWP';
  leaveTypeFull: string;
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  appliedOn: string;
  approvedBy: string | null;
}

export interface LeaveBalance {
  employeeId: string;
  type: string;
  typeCode: string;
  total: number;
  used: number;
  balance: number;
}

export interface PayrollRun {
  id: string;
  month: string;
  year: number;
  status: 'draft' | 'processing' | 'completed' | 'paid';
  employeeCount: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  processedOn: string | null;
  paidOn: string | null;
}

export interface Payslip {
  id: string;
  employeeId: string;
  employeeName: string;
  empCode: string;
  month: string;
  year: number;
  basic: number;
  hra: number;
  conveyance: number;
  specialAllowance: number;
  grossEarnings: number;
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
  professionalTax: number;
  tds: number;
  totalDeductions: number;
  netPay: number;
}

export interface Department {
  id: string;
  name: string;
  head: string;
  employeeCount: number;
  designations: string[];
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'national' | 'company' | 'restricted';
  applicable: string;
}

// ── Mock Data ──

export const MOCK_EMPLOYEES: Employee[] = [
  { id: 'e1', empCode: 'SAP-001', firstName: 'Rahul', lastName: 'Sharma', email: 'rahul.sharma@company.com', phone: '9876543210', department: 'Engineering', designation: 'Senior Developer', dateOfJoining: '2023-04-15', status: 'active', salary: 85000, bankAccount: 'HDFC ****4521', pan: 'ABCPS1234R', aadhaar: '****5678', pfNumber: 'KA/BLR/0012345/001', esiNumber: 'KA-1234567890', reportingTo: 'Vikram Patel', shift: 'General (09:00-18:00)', },
  { id: 'e2', empCode: 'SAP-002', firstName: 'Priya', lastName: 'Patel', email: 'priya.patel@company.com', phone: '9876543211', department: 'Engineering', designation: 'Full Stack Developer', dateOfJoining: '2023-06-01', status: 'active', salary: 72000, bankAccount: 'ICICI ****7823', pan: 'DEFPP5678S', aadhaar: '****9012', pfNumber: 'KA/BLR/0012345/002', esiNumber: 'KA-1234567891', reportingTo: 'Rahul Sharma', shift: 'General (09:00-18:00)', },
  { id: 'e3', empCode: 'SAP-003', firstName: 'Amit', lastName: 'Kumar', email: 'amit.kumar@company.com', phone: '9876543212', department: 'Sales', designation: 'Sales Manager', dateOfJoining: '2022-11-20', status: 'active', salary: 65000, bankAccount: 'SBI ****3456', pan: 'GHIAK9012T', aadhaar: '****3456', pfNumber: 'KA/BLR/0012345/003', esiNumber: 'KA-1234567892', reportingTo: 'Neha Gupta', shift: 'General (09:00-18:00)', },
  { id: 'e4', empCode: 'SAP-004', firstName: 'Neha', lastName: 'Gupta', email: 'neha.gupta@company.com', phone: '9876543213', department: 'Sales', designation: 'VP Sales', dateOfJoining: '2022-04-01', status: 'active', salary: 120000, bankAccount: 'Axis ****8901', pan: 'JKLNG3456U', aadhaar: '****7890', pfNumber: 'KA/BLR/0012345/004', esiNumber: '', reportingTo: '', shift: 'General (09:00-18:00)', },
  { id: 'e5', empCode: 'SAP-005', firstName: 'Arjun', lastName: 'Mehta', email: 'arjun.mehta@company.com', phone: '9876543214', department: 'Operations', designation: 'Operations Lead', dateOfJoining: '2023-09-15', status: 'active', salary: 58000, bankAccount: 'HDFC ****2345', pan: 'MNOAM7890V', aadhaar: '****1234', pfNumber: 'KA/BLR/0012345/005', esiNumber: 'KA-1234567894', reportingTo: 'Vikram Patel', shift: 'Morning (08:00-17:00)', },
  { id: 'e6', empCode: 'SAP-006', firstName: 'Sneha', lastName: 'Reddy', email: 'sneha.reddy@company.com', phone: '9876543215', department: 'Human Resources', designation: 'HR Manager', dateOfJoining: '2022-08-10', status: 'active', salary: 75000, bankAccount: 'Kotak ****6789', pan: 'PQRSR1234W', aadhaar: '****5678', pfNumber: 'KA/BLR/0012345/006', esiNumber: '', reportingTo: '', shift: 'General (09:00-18:00)', },
  { id: 'e7', empCode: 'SAP-007', firstName: 'Vikram', lastName: 'Patel', email: 'vikram.patel@company.com', phone: '9876543216', department: 'Engineering', designation: 'CTO', dateOfJoining: '2022-01-01', status: 'active', salary: 180000, bankAccount: 'HDFC ****0123', pan: 'STUVP5678X', aadhaar: '****9012', pfNumber: 'KA/BLR/0012345/007', esiNumber: '', reportingTo: '', shift: 'General (09:00-18:00)', },
  { id: 'e8', empCode: 'SAP-008', firstName: 'Kavitha', lastName: 'Nair', email: 'kavitha.nair@company.com', phone: '9876543217', department: 'Finance', designation: 'Accountant', dateOfJoining: '2024-01-08', status: 'probation', salary: 45000, bankAccount: 'SBI ****4567', pan: 'WXYKN9012Y', aadhaar: '****3456', pfNumber: 'KA/BLR/0012345/008', esiNumber: 'KA-1234567897', reportingTo: 'Sneha Reddy', shift: 'General (09:00-18:00)', },
  { id: 'e9', empCode: 'SAP-009', firstName: 'Deepak', lastName: 'Singh', email: 'deepak.singh@company.com', phone: '9876543218', department: 'Operations', designation: 'Field Executive', dateOfJoining: '2024-02-15', status: 'active', salary: 32000, bankAccount: 'PNB ****7890', pan: 'ABCDS3456Z', aadhaar: '****7890', pfNumber: 'KA/BLR/0012345/009', esiNumber: 'KA-1234567898', reportingTo: 'Arjun Mehta', shift: 'Morning (08:00-17:00)', },
  { id: 'e10', empCode: 'SAP-010', firstName: 'Meera', lastName: 'Joshi', email: 'meera.joshi@company.com', phone: '9876543219', department: 'Engineering', designation: 'QA Engineer', dateOfJoining: '2023-11-01', status: 'on_leave', salary: 55000, bankAccount: 'ICICI ****1234', pan: 'EFGMJ7890A', aadhaar: '****1234', pfNumber: 'KA/BLR/0012345/010', esiNumber: 'KA-1234567899', reportingTo: 'Rahul Sharma', shift: 'General (09:00-18:00)', },
];

const today = new Date().toISOString().split('T')[0];

export const MOCK_ATTENDANCE: AttendanceRecord[] = MOCK_EMPLOYEES.filter(e => e.status === 'active').map((emp, i) => ({
  id: `att_${emp.id}`,
  employeeId: emp.id,
  employeeName: `${emp.firstName} ${emp.lastName}`,
  date: today,
  punchIn: i < 7 ? `0${8 + (i % 2)}:${String(i * 7 % 60).padStart(2, '0')}` : null,
  punchOut: i < 5 ? `1${7 + (i % 2)}:${String(i * 11 % 60).padStart(2, '0')}` : null,
  status: i < 7 ? (i === 2 ? 'late' : 'present') : (i === 7 ? 'half_day' : 'absent'),
  hoursWorked: i < 5 ? 8 + (i % 2) : i < 7 ? 4 + i : 0,
  location: i % 3 === 0 ? 'Office HQ' : i % 3 === 1 ? 'Remote' : 'Field',
  method: i % 4 === 0 ? 'biometric' : i % 4 === 1 ? 'geo' : i % 4 === 2 ? 'mobile' : 'manual',
}));

export const MOCK_LEAVE_REQUESTS: LeaveRequest[] = [
  { id: 'lr1', employeeId: 'e10', employeeName: 'Meera Joshi', leaveType: 'EL', leaveTypeFull: 'Earned Leave', fromDate: '2026-05-26', toDate: '2026-05-30', days: 5, reason: 'Family vacation to Goa', status: 'approved', appliedOn: '2026-05-20', approvedBy: 'Rahul Sharma' },
  { id: 'lr2', employeeId: 'e3', employeeName: 'Amit Kumar', leaveType: 'CL', leaveTypeFull: 'Casual Leave', fromDate: '2026-05-29', toDate: '2026-05-29', days: 1, reason: 'Personal work', status: 'pending', appliedOn: '2026-05-27', approvedBy: null },
  { id: 'lr3', employeeId: 'e5', employeeName: 'Arjun Mehta', leaveType: 'SL', leaveTypeFull: 'Sick Leave', fromDate: '2026-05-22', toDate: '2026-05-23', days: 2, reason: 'Fever and cold', status: 'approved', appliedOn: '2026-05-22', approvedBy: 'Vikram Patel' },
  { id: 'lr4', employeeId: 'e2', employeeName: 'Priya Patel', leaveType: 'CL', leaveTypeFull: 'Casual Leave', fromDate: '2026-06-02', toDate: '2026-06-03', days: 2, reason: 'Sister wedding ceremony', status: 'pending', appliedOn: '2026-05-26', approvedBy: null },
  { id: 'lr5', employeeId: 'e9', employeeName: 'Deepak Singh', leaveType: 'EL', leaveTypeFull: 'Earned Leave', fromDate: '2026-05-15', toDate: '2026-05-16', days: 2, reason: 'Home town visit', status: 'rejected', appliedOn: '2026-05-10', approvedBy: 'Arjun Mehta' },
];

export const MOCK_LEAVE_BALANCES: LeaveBalance[] = MOCK_EMPLOYEES.map(emp => [
  { employeeId: emp.id, type: 'Casual Leave', typeCode: 'CL', total: 12, used: Math.floor(Math.random() * 6), balance: 0 },
  { employeeId: emp.id, type: 'Sick Leave', typeCode: 'SL', total: 12, used: Math.floor(Math.random() * 4), balance: 0 },
  { employeeId: emp.id, type: 'Earned Leave', typeCode: 'EL', total: 15, used: Math.floor(Math.random() * 8), balance: 0 },
]).flat().map(lb => ({ ...lb, balance: lb.total - lb.used }));

function calcPayslip(emp: Employee, month: string, year: number): Payslip {
  const basic = Math.round(emp.salary * 0.40);
  const hra = Math.round(emp.salary * 0.20);
  const conveyance = 1600;
  const specialAllowance = emp.salary - basic - hra - conveyance;
  const gross = emp.salary;
  const pfBase = Math.min(basic, 15000);
  const pfEmp = Math.round(pfBase * 0.12);
  const pfEr = Math.round(pfBase * 0.12);
  const esiEmp = emp.salary <= 21000 ? Math.round(emp.salary * 0.0075) : 0;
  const esiEr = emp.salary <= 21000 ? Math.round(emp.salary * 0.0325) : 0;
  const pt = emp.salary > 15000 ? 200 : emp.salary > 10000 ? 150 : 0;
  const tds = Math.round(emp.salary * 0.05);
  const totalDed = pfEmp + esiEmp + pt + tds;
  return {
    id: `ps_${emp.id}_${year}_${month}`,
    employeeId: emp.id,
    employeeName: `${emp.firstName} ${emp.lastName}`,
    empCode: emp.empCode,
    month, year, basic, hra, conveyance, specialAllowance,
    grossEarnings: gross,
    pfEmployee: pfEmp, pfEmployer: pfEr,
    esiEmployee: esiEmp, esiEmployer: esiEr,
    professionalTax: pt, tds,
    totalDeductions: totalDed,
    netPay: gross - totalDed,
  };
}

export const MOCK_PAYSLIPS: Payslip[] = MOCK_EMPLOYEES
  .filter(e => e.status !== 'terminated')
  .map(emp => calcPayslip(emp, 'April', 2026));

export const MOCK_PAYROLL_RUNS: PayrollRun[] = [
  { id: 'pr_apr26', month: 'April', year: 2026, status: 'completed', employeeCount: 10, totalGross: MOCK_PAYSLIPS.reduce((s, p) => s + p.grossEarnings, 0), totalDeductions: MOCK_PAYSLIPS.reduce((s, p) => s + p.totalDeductions, 0), totalNet: MOCK_PAYSLIPS.reduce((s, p) => s + p.netPay, 0), processedOn: '2026-04-28', paidOn: '2026-04-30' },
  { id: 'pr_may26', month: 'May', year: 2026, status: 'draft', employeeCount: 10, totalGross: 0, totalDeductions: 0, totalNet: 0, processedOn: null, paidOn: null },
];

export const MOCK_DEPARTMENTS: Department[] = [
  { id: 'd1', name: 'Engineering', head: 'Vikram Patel', employeeCount: 4, designations: ['CTO', 'Senior Developer', 'Full Stack Developer', 'QA Engineer'] },
  { id: 'd2', name: 'Sales', head: 'Neha Gupta', employeeCount: 2, designations: ['VP Sales', 'Sales Manager', 'Sales Executive'] },
  { id: 'd3', name: 'Operations', head: 'Arjun Mehta', employeeCount: 2, designations: ['Operations Lead', 'Field Executive'] },
  { id: 'd4', name: 'Human Resources', head: 'Sneha Reddy', employeeCount: 1, designations: ['HR Manager', 'HR Executive'] },
  { id: 'd5', name: 'Finance', head: 'Sneha Reddy', employeeCount: 1, designations: ['Accountant', 'Finance Manager'] },
];

export const MOCK_HOLIDAYS: Holiday[] = [
  { id: 'h1', name: 'Republic Day', date: '2026-01-26', type: 'national', applicable: 'All' },
  { id: 'h2', name: 'Holi', date: '2026-03-17', type: 'national', applicable: 'All' },
  { id: 'h3', name: 'Good Friday', date: '2026-04-03', type: 'restricted', applicable: 'Optional' },
  { id: 'h4', name: 'May Day', date: '2026-05-01', type: 'national', applicable: 'All' },
  { id: 'h5', name: 'Independence Day', date: '2026-08-15', type: 'national', applicable: 'All' },
  { id: 'h6', name: 'Ganesh Chaturthi', date: '2026-08-27', type: 'restricted', applicable: 'Optional' },
  { id: 'h7', name: 'Mahatma Gandhi Jayanti', date: '2026-10-02', type: 'national', applicable: 'All' },
  { id: 'h8', name: 'Dussehra', date: '2026-10-12', type: 'national', applicable: 'All' },
  { id: 'h9', name: 'Diwali', date: '2026-11-08', type: 'national', applicable: 'All' },
  { id: 'h10', name: 'Christmas', date: '2026-12-25', type: 'national', applicable: 'All' },
  { id: 'h11', name: 'Company Foundation Day', date: '2026-07-15', type: 'company', applicable: 'All' },
  { id: 'h12', name: 'Annual Offsite', date: '2026-09-19', type: 'company', applicable: 'All' },
];

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}
