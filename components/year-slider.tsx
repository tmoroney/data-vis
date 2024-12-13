"use client"

import * as React from "react"
import { Slider } from "@/components/ui/slider"

interface YearSliderProps {
  minYear?: number
  maxYear?: number
  defaultYear?: number
  onChange?: (year: number) => void
}

export function YearSlider({
  minYear = 1900,
  maxYear = new Date().getFullYear(),
  defaultYear = new Date().getFullYear(),
  onChange
}: YearSliderProps) {
  const [year, setYear] = React.useState(defaultYear)

  const handleYearChange = (values: number[]) => {
    const newYear = Math.round(values[0])
    setYear(newYear)
    onChange?.(newYear)
  }

  return (
    <div className="space-y-2 p-1">
      <div className="text-center text-xl font-semibold">{year}</div>
      <Slider
        min={minYear}
        max={maxYear}
        step={1}
        value={[year]}
        onValueChange={handleYearChange}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{minYear}</span>
        <span>{maxYear}</span>
      </div>
    </div>
  )
}

