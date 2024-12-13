"use client"
import { useState, useEffect } from "react"
import { YearSlider } from "@/components/year-slider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Database } from "lucide-react"
import Map from "@/components/globe-map"
import * as d3 from "d3"

import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const frameworks = [
  {
    value: "next.js",
    label: "Next.js",
  },
  {
    value: "sveltekit",
    label: "SvelteKit",
  },
  {
    value: "nuxt.js",
    label: "Nuxt.js",
  },
  {
    value: "remix",
    label: "Remix",
  },
  {
    value: "astro",
    label: "Astro",
  },
]

interface Category {
  value: string
  label: string
}

export default function Home() {
  const [year, setYear] = useState(2023)

  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")
  const [data, setData] = useState<d3.DSVRowArray<string>>(() => d3.csvParse(""))
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    const fetchData = async () => {
      let csvData = await d3.csv("/exports.csv");
      // get only the Commodity Group column and only for the year 20000
      let csvCategories = [];
      let categoriesSet = new Set();
      for (let i = 0; i < csvData.length && csvData[i]["Year"] == "2000"; i++) {
        if (categoriesSet.has(csvData[i]["Commodity Group"])) continue;
        categoriesSet.add(csvData[i]["Commodity Group"]);
        csvCategories.push({
          value: csvData[i]["Commodity Group"],
          label: csvData[i]["Commodity Group"].split("(")[0],
        });
      }
      setData(csvData);
      setCategories(csvCategories);
      setValue(csvCategories[0].value);
    }
    fetchData();
  }, []);

  return (
    <main className="relative min-h-screen">
      <div className="fixed top-4 right-4 z-50">
        <Card className="w-80 bg-background/70 backdrop-blur-sm shadow-lg">
          <CardContent className="p-4">
            <YearSlider
              minYear={2000}
              maxYear={2023}
              defaultYear={2023}
              onChange={(year) => setYear(year)}
            />
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={open}
                  className="justify-between w-full mt-4"
                >
                  {value
                    ? categories.find((category) => category.value === value)?.label
                    : "Select trade category..."}
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0">
                <Command>
                  <CommandInput placeholder="Search trade category..." />
                  <CommandList>
                    <CommandEmpty>No framework found.</CommandEmpty>
                    <CommandGroup>
                      {categories.map((category) => (
                        <CommandItem
                          key={category.value}
                          value={category.value}
                          onSelect={(currentValue) => {
                            setValue(currentValue === value ? "" : currentValue)
                            setOpen(false)
                          }}
                        >
                          {category.label}
                          <Check
                            className={cn(
                              "ml-auto",
                              value === category.value ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {/*             
            <Select value={category} onValueChange={(value) => setCategory(value)}>
              <SelectTrigger className="mt-4 bg-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Total merchandise trade (0 - 9)">All Commodities</SelectItem>
                <SelectItem value="Live animals except fish etc. (00)">Live animals except fish etc.</SelectItem>
                <SelectItem value="Meat and meat preparations (01)">Meat and meat preparations</SelectItem>
                <SelectItem value="Dairy products and birds eggs (02)">Dairy products and birds' eggs</SelectItem>
                <SelectItem value="Fish, crustaceans, molluscs and preparations thereof (03)">Fish, crustaceans, molluscs etc.</SelectItem>
                <SelectItem value="Cereals and cereal preparations (04)">Cereals and cereal preparations</SelectItem>
                <SelectItem value="Vegetables and fruit (05)">Vegetables and fruit</SelectItem>
                <SelectItem value="Sugar, sugar preparations and honey (06)">Sugar, sugar preparations and honey</SelectItem>
                <SelectItem value="Coffee, tea, cocoa, spices and manufactures thereof (07)">Coffee, tea, cocoa, spices etc.</SelectItem>
                <SelectItem value="Feeding stuffs for animals, excluding unmilled cereals (08)">Feeding stuffs for animals, excluding unmilled cereals</SelectItem>
                <SelectItem value="Miscellaneous edible products and preparations (09)">Miscellaneous edible products and preparations</SelectItem>
                <SelectItem value="Beverages (11)">Beverages</SelectItem>
                <SelectItem value="Tobacco and tobacco manufactures (12)">Tobacco and tobacco manufactures</SelectItem>
                <SelectItem value="Hides, skins and furskins, raw (21)">Hides, skins and furskins, raw</SelectItem>
                <SelectItem value="Oilseeds and oleaginous fruit (22)">Oilseeds and oleaginous fruit</SelectItem>
                <SelectItem value="Crude rubber, including synthetic and reclaimed rubber (23)">Crude rubber, including synthetic and reclaimed rubber</SelectItem>
              </SelectContent>
            </Select> */}
            <a href="https://data.cso.ie/table/TSA10" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="w-full mt-3">
                <Database />
                View Data Source
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
      {data.length > 0 ? (
        <div>
          <Map data={data} category={value} year={year.toString()}/>
        </div>
      )
        : (
          <div className="flex items-center justify-center h-screen">
            <div className="flex flex-col items-center space-y-4">
              <h1 className="text-2xl font-bold">Loading data...</h1>
              <div className="animate-spin">
                <Database className="w-12 h-12 text-primary" />
              </div>
            </div>
          </div>
        )}
    </main>
  )
}


