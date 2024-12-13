"use client"
import {useState} from "react"
import { YearSlider } from "@/components/year-slider"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Database } from "lucide-react"
import Map from "@/components/globe-map"

export default function Home() {
  const [category, setCategory] = useState("all")
  const [year, setYear] = useState(2023)

  return (
    <main className="relative min-h-screen">
      <div className="fixed top-4 right-4 z-50">
        <Card className="w-64 bg-background/70 backdrop-blur-sm shadow-lg">
          <CardContent className="p-4">
            <YearSlider
              minYear={2000}
              maxYear={2023}
              defaultYear={2023}
              onChange={(year) => setYear(year)}
            />
            <Select value={category} onValueChange={(value) => setCategory(value)}>
              <SelectTrigger className="mt-4 bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Commodities</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <a href="https://data.cso.ie/table/TSA10" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full mt-3">
                <Database />
                View Data Source
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
      <div>
        <Map />
      </div>
    </main>
  )
}


