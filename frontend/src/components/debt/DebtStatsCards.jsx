import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, HandCoins, Users } from "lucide-react";

const formatCurrency = (val) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(
    val || 0
  );

/**
 * @param {"customer"|"supplier"} type
 * @param {Array} data - Danh sách công nợ (view_customer_debts / view_supplier_debts rows)
 */
export function DebtStatsCards({ type, data = [] }) {
  const isCustomer = type === "customer";

  const totalBalance = data.reduce(
    (sum, d) => sum + Math.max(Number(d.balance) || 0, 0),
    0
  );
  const totalPaid = data.reduce((sum, d) => sum + (Number(d.paid_total) || 0), 0);
  const owingCount = data.filter((d) => Number(d.balance) > 0).length;

  const cards = [
    {
      title: isCustomer ? "Tổng còn phải thu" : "Tổng còn phải trả",
      value: formatCurrency(totalBalance),
      icon: <TrendingUp className="h-6 w-6 text-rose-600" />,
      border: "border-rose-200",
      bg: "bg-rose-50",
      textColor: "text-rose-700",
    },
    {
      title: isCustomer ? "Tổng đã thu" : "Tổng đã trả",
      value: formatCurrency(totalPaid),
      icon: <HandCoins className="h-6 w-6 text-emerald-600" />,
      border: "border-emerald-200",
      bg: "bg-emerald-50",
      textColor: "text-emerald-700",
    },
    {
      title: isCustomer ? "Khách còn nợ" : "NCC còn nợ",
      value: `${owingCount} / ${data.length}`,
      icon: <Users className="h-6 w-6 text-gray-900" />,
      border: "border-gray-200",
      bg: "bg-white",
      textColor: "text-gray-900",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((c, i) => (
        <Card key={i} className={`${c.border} ${c.bg}`}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-lg ${c.textColor}`}>{c.title}</CardTitle>
            {c.icon}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${c.textColor}`}>{c.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
