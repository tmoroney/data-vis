"use client"
import { useState, useEffect } from "react"
import { YearSlider } from "@/components/year-slider"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import GlobeMap from "@/components/globe-map"
import PieChart from "@/components/pie-chart"
import * as d3 from "d3"

import { Check, ChevronsUpDown, LoaderCircle, Database, ChartLine } from "lucide-react"
import LineChart from "@/components/line-chart"

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Category {
  value: string
  label: string
}

export default function Home() {
  const [year, setYear] = useState(2023)

  const [openDialog, setOpenDialog] = useState(false)
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState("")
  const [data, setData] = useState<d3.DSVRowArray<string>>(() => d3.csvParse(""))
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCountry, setSelectedCountry] = useState<string>("Germany");

  const handleSelectedCountry = (country: string) => {
    if (country === "Ireland") return;
    if (country === "United States of America") country = "USA";
    setSelectedCountry(country);
    setOpenDialog(true);
  };

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
    <>
      <main className="relative min-h-screen">
        <div className="fixed bottom-4 left-4 z-50">
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
                    className="justify-between w-full mt-4 overflow-hidden"
                  >
                    {value
                      ? categories.find((category) => category.value === value)?.label
                      : "Select trade category..."}
                    <ChevronsUpDown className="opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0">
                  <Command>
                    <CommandInput placeholder="Search trade categories..." />
                    <CommandList>
                      <CommandEmpty>No category found.</CommandEmpty>
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
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="default" className="w-full mt-3"><ChartLine/>Yearly Exports Chart</Button>
                </DialogTrigger>
                <DialogContent className="max-w-[850px]">
                  <DialogHeader>
                    <DialogTitle>Category: {value.split('(')[0].trim()}</DialogTitle>
                    <DialogDescription>
                      Showing yearly exports from 2000 to 2023.
                    </DialogDescription>
                  </DialogHeader>
                  <LineChart data={data} category={value} />
                </DialogContent>
              </Dialog>
              <a href="https://data.cso.ie/table/TSA10" target="_blank" rel="noopener noreferrer">
                <Button variant="secondary" className="w-full mt-3">
                  <Database />
                  View Data Source
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>
        {data.length > 0 ? (
          <div>
            <GlobeMap data={data} category={value} year={year.toString()} onCountrySelect={handleSelectedCountry} />
          </div>
        )
          : (
            <div className="flex items-center justify-center h-screen">
              <div className="flex flex-col items-center space-y-4">
                <h1 className="text-2xl font-bold">Loading data...</h1>
                <div className="animate-spin">
                  <LoaderCircle className="w-12 h-12 text-primary" />
                </div>
              </div>
            </div>
          )}
      </main>
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader className="pb-0">
            <DialogTitle>Exports to {selectedCountry} ({year})</DialogTitle>
            <DialogDescription>
              Showing breakdown of exports to {selectedCountry} for the year {year}.
            </DialogDescription>
          </DialogHeader>

          <PieChart data={data} country={selectedCountry} year={year.toString()} />
        </DialogContent>
      </Dialog>
    </>
  )
}


