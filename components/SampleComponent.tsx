"use client";

import React from "react";

interface SampleComponentProps {
  title: string;
  description?: string;
}

export default function SampleComponent({ title, description }: SampleComponentProps) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg">
      <h2 className="text-xl font-bold">{title}</h2>
      {description && <p className="text-gray-600 mt-2">{description}</p>}
    </div>
  );
}