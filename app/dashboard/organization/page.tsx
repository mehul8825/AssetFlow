"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepartmentTab } from "./department-tab";
import { CategoryTab } from "./category-tab";
import { EmployeeTab } from "./employee-tab";

export default function OrganizationPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("departments");

  if (user?.role !== "Admin") {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Access denied. Admin only.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Organization Setup
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage departments, asset categories, and employee directory.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="departments" className="min-w-[140px]">Departments</TabsTrigger>
          <TabsTrigger value="categories" className="min-w-[160px]">Asset Categories</TabsTrigger>
          <TabsTrigger value="employees" className="min-w-[170px]">Employee Directory</TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="mt-6">
          <DepartmentTab />
        </TabsContent>
        <TabsContent value="categories" className="mt-6">
          <CategoryTab />
        </TabsContent>
        <TabsContent value="employees" className="mt-6">
          <EmployeeTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
