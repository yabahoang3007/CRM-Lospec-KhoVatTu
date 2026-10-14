// Thoát giá trị để an toàn khi ghi vào file CSV (mở được bằng Excel)
export const csvSafe = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

export const csvRow = (values) => values.map(csvSafe).join(",") + "\n";
