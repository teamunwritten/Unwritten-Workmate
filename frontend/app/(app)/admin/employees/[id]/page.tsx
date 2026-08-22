import { notFound } from "next/navigation";
import { backendFetch } from "@/lib/session";
import { Department, Employee, LeaveBalance, roleLabel } from "@/lib/types";
import Avatar from "@/components/Avatar";
import EmployeeEditPanel from "@/components/EmployeeEditPanel";

async function getEmployee(id: string): Promise<Employee | null> {
  const res = await backendFetch(`/admin/employees/${id}`);
  if (!res.ok) return null;
  return res.json();
}

async function getBalances(id: string): Promise<LeaveBalance[]> {
  const res = await backendFetch(`/admin/employees/${id}/balances`);
  if (!res.ok) return [];
  return res.json();
}

async function getDepartments(): Promise<Department[]> {
  const res = await backendFetch("/admin/departments");
  if (!res.ok) return [];
  return res.json();
}

async function getEmployees(): Promise<Employee[]> {
  const res = await backendFetch("/admin/employees");
  if (!res.ok) return [];
  return res.json();
}

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-success-soft text-success",
  PROBATION: "bg-warning-soft text-warning",
  NOTICE_PERIOD: "bg-danger-soft text-danger",
  TERMINATED: "bg-canvas text-muted",
};

export default async function EmployeeProfilePage({ params }: { params: { id: string } }) {
  const [employee, balances, departments, employees] = await Promise.all([
    getEmployee(params.id),
    getBalances(params.id),
    getDepartments(),
    getEmployees(),
  ]);
  if (!employee) notFound();

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="card p-6 flex flex-col sm:flex-row sm:items-center gap-5 justify-between">
        <div className="flex items-center gap-4 min-w-0">
          <Avatar name={employee.full_name} size={64} pictureUrl={employee.picture_url} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold tracking-tight truncate">{employee.full_name}</h1>
              <span className="text-xs text-muted">{employee.employee_code}</span>
              <span className={`badge ${STATUS_STYLE[employee.employment_status] || "bg-canvas text-muted"}`}>
                {employee.employment_status.replace("_", " ")}
              </span>
            </div>
            <div className="text-sm text-muted">
              {employee.position || roleLabel(employee.role)}
              {employee.department_name ? ` · ${employee.department_name}` : ""}
            </div>
            <div className="text-xs text-muted mt-0.5">{employee.email}</div>
            <div className="text-xs text-muted mt-0.5">
              Joined {new Date(employee.date_of_joining + "T00:00:00").toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5 space-y-3">
          <div className="text-sm font-semibold mb-1">Details</div>
          <DetailRow label="Employee code" value={employee.employee_code} />
          <DetailRow label="Manager" value={employee.manager_name || "—"} />
          <DetailRow label="Date of joining" value={employee.date_of_joining} />
          <DetailRow label="Position" value={employee.position || "—"} />
          <DetailRow label="Department" value={employee.department_name || "—"} />
          {employee.employment_status === "NOTICE_PERIOD" && (
            <>
              <DetailRow label="Notice start" value={employee.notice_period_start || "—"} />
              <DetailRow label="Notice end" value={employee.notice_period_end || "—"} />
            </>
          )}
          <DetailRow label="Account status" value={employee.is_active ? "Active" : "Deactivated"} />
          <DetailRow label="Google sign-in" value={employee.google_linked ? "Linked" : "Not signed in yet"} />
        </div>

        <div className="card p-5 space-y-3">
          <div className="text-sm font-semibold mb-1">Contact details</div>
          <DetailRow label="Work email" value={employee.email} />
          <DetailRow label="Personal email" value={employee.personal_email || "—"} />
          <DetailRow label="Phone number" value={employee.phone_number || "—"} />
          <DetailRow label="Address" value={employee.address || "—"} />
          <DetailRow label="Emergency contact" value={employee.emergency_contact_name || "—"} />
          <DetailRow label="Emergency contact phone" value={employee.emergency_contact_phone || "—"} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EmployeeEditPanel employee={employee} departments={departments} managers={employees} />
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <div className="text-sm font-semibold">Leave balances</div>
        </div>
        <table className="w-full data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Entitled</th>
              <th>Accrued</th>
              <th>Used</th>
              <th>Carried forward</th>
              <th>Available</th>
            </tr>
          </thead>
          <tbody>
            {balances
              .filter((b) => !["WFH", "OD", "LOP"].includes(b.leave_type_code))
              .map((b) => (
                <tr key={b.leave_type_id}>
                  <td className="font-medium">{b.leave_type_code}</td>
                  <td className="tabular-nums">{b.entitled_days}</td>
                  <td className="tabular-nums">{b.accrued_days}</td>
                  <td className="tabular-nums">{b.used_days}</td>
                  <td className="tabular-nums">{b.carried_forward_days}</td>
                  <td className="tabular-nums font-medium">{b.available_days}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-muted">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
