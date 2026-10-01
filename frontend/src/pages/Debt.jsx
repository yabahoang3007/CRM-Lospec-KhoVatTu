import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DebtList } from "@/components/debt/DebtList";
import { ReturnsList } from "@/components/debt/ReturnsList";

const Debt = () => {
  return (
    <div className="mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Công nợ & Thu chi</h1>
        <p className="text-gray-600">
          Theo dõi công nợ phải thu (khách hàng), phải trả (nhà cung cấp) và
          lịch sử trả hàng
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
          <TabsTrigger
            value="returns"
            className="text-gray-400 data-[state=active]:text-gray-900"
          >
            Trả hàng
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="mt-0">
          <DebtList type="customer" />
        </TabsContent>
        <TabsContent value="suppliers" className="mt-0">
          <DebtList type="supplier" />
        </TabsContent>
        <TabsContent value="returns" className="mt-0">
          <ReturnsList />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Debt;
