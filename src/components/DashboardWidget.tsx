import React from 'react';

// 1. Định nghĩa kiểu cho Props
interface DashboardWidgetProps {
  title: string;
  value: string | number; // Cho phép giá trị là string hoặc number
}

// 2. Sử dụng React.FC (Functional Component) với kiểu Props
const DashboardWidget: React.FC<DashboardWidgetProps> = ({ title, value }) => {
  return (
    <div className="widget">
      <h3 className="widget-title">{title}</h3>
      <p className="widget-value">{value}</p>
    </div>
  );
}

export default DashboardWidget;