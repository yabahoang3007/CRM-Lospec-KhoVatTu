import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DebtList } from "@/components/debt/DebtList";

const Debt = () => {
  return (
    <div className="mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Công nợ & Thu chi</h1>
        <p className="text-gray-600">
          Theo dõi công nợ phải thu (khách hàng) và phải trả (nhà cung cấp)
        </p>
      </div>

      <Tabs defaultValue="customers" className="space-y-4">
        <TabsList>
          <TabsTrigger
            value="customers"
            className="text-gray-400 data-[state=active]:text-gray-900"
          >
            Khách hàng
          </TabsTrigger>
          <TabsTrigger
            value="suppliers"
            className="text-gray-400 data-[state=active]:text-gray-900"
          >
            Nhà cung cấp
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="mt-0">
          <DebtList type="customer" />
        </TabsContent>
        <TabsContent value="suppliers" className="mt-0">
          <DebtList type="supplier" />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Debt;
