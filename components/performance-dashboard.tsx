"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts"
import { TrendingUp, Clock, Zap, Target, Download, RefreshCw } from "lucide-react"

interface PerformanceMetrics {
  algorithm: string
  completionRate: number
  totalDistance: number
  energyConsumption: number
  executionTime: number
  timestamp: string
}

interface PerformanceDashboardProps {
  results: any[]
  onRunBenchmark: () => void
  isRunning: boolean
}

export function PerformanceDashboard({ results, onRunBenchmark, isRunning }: PerformanceDashboardProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([])
  const [selectedMetric, setSelectedMetric] = useState<string>("completionRate")

  useEffect(() => {
    if (results.length > 0) {
      const processedMetrics = results.map((result) => ({
        algorithm: result.algorithm,
        completionRate: (result.completed_deliveries / 20) * 100, // Assuming 20 total deliveries
        totalDistance: result.total_distance,
        energyConsumption: result.energy_consumption,
        executionTime: result.execution_time,
        timestamp: new Date().toISOString(),
      }))
      setMetrics(processedMetrics)
    }
  }, [results])

  const getChartData = () => {
    return metrics.map((metric) => ({
      name: metric.algorithm.split(" ")[0], // Kısa isim
      "Tamamlanma Oranı (%)": metric.completionRate,
      "Toplam Mesafe": metric.totalDistance,
      "Enerji Tüketimi": metric.energyConsumption,
      "Çalışma Süresi (ms)": metric.executionTime,
    }))
  }

  const getRadarData = () => {
    if (metrics.length === 0) return []

    const maxValues = {
      completionRate: Math.max(...metrics.map((m) => m.completionRate)),
      totalDistance: Math.max(...metrics.map((m) => m.totalDistance)),
      energyConsumption: Math.max(...metrics.map((m) => m.energyConsumption)),
      executionTime: Math.max(...metrics.map((m) => m.executionTime)),
    }

    return metrics.map((metric) => ({
      algorithm: metric.algorithm.split(" ")[0],
      Tamamlanma: (metric.completionRate / maxValues.completionRate) * 100,
      Mesafe: 100 - (metric.totalDistance / maxValues.totalDistance) * 100, // Ters çevir (düşük daha iyi)
      Enerji: 100 - (metric.energyConsumption / maxValues.energyConsumption) * 100, // Ters çevir
      Hız: 100 - (metric.executionTime / maxValues.executionTime) * 100, // Ters çevir
    }))
  }

  const getBestPerformer = (metric: keyof PerformanceMetrics) => {
    if (metrics.length === 0) return null

    if (metric === "completionRate") {
      return metrics.reduce((best, current) => (current.completionRate > best.completionRate ? current : best))
    } else {
      return metrics.reduce((best, current) => (current[metric] < best[metric] ? current : best))
    }
  }

  const exportResults = () => {
    const dataStr = JSON.stringify(metrics, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = "performance_metrics.json"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Performans Analizi
            </span>
            <div className="flex gap-2">
              <Button onClick={onRunBenchmark} disabled={isRunning} size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${isRunning ? "animate-spin" : ""}`} />
                Benchmark Çalıştır
              </Button>
              {metrics.length > 0 && (
                <Button onClick={exportResults} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Dışa Aktar
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        {isRunning && (
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Performans testi çalışıyor...</p>
              <Progress value={33} className="w-full" />
            </div>
          </CardContent>
        )}
      </Card>

      {metrics.length > 0 && (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  En İyi Tamamlanma
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{getBestPerformer("completionRate")?.completionRate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-600">{getBestPerformer("completionRate")?.algorithm}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  En Kısa Mesafe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{getBestPerformer("totalDistance")?.totalDistance.toFixed(1)}</p>
                  <p className="text-xs text-gray-600">{getBestPerformer("totalDistance")?.algorithm}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  En Az Enerji
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">
                    {getBestPerformer("energyConsumption")?.energyConsumption.toFixed(1)}
                  </p>
                  <p className="text-xs text-gray-600">{getBestPerformer("energyConsumption")?.algorithm}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  En Hızlı
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{getBestPerformer("executionTime")?.executionTime.toFixed(1)}ms</p>
                  <p className="text-xs text-gray-600">{getBestPerformer("executionTime")?.algorithm}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <Card>
            <CardHeader>
              <CardTitle>Detaylı Performans Analizi</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="bar" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="bar">Çubuk Grafik</TabsTrigger>
                  <TabsTrigger value="radar">Radar Grafik</TabsTrigger>
                  <TabsTrigger value="table">Tablo</TabsTrigger>
                </TabsList>

                <TabsContent value="bar" className="space-y-4">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={getChartData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Tamamlanma Oranı (%)" fill="#8884d8" />
                        <Bar dataKey="Toplam Mesafe" fill="#82ca9d" />
                        <Bar dataKey="Enerji Tüketimi" fill="#ffc658" />
                        <Bar dataKey="Çalışma Süresi (ms)" fill="#ff7300" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="radar" className="space-y-4">
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={getRadarData()}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="algorithm" />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} />
                        <Radar
                          name="Tamamlanma"
                          dataKey="Tamamlanma"
                          stroke="#8884d8"
                          fill="#8884d8"
                          fillOpacity={0.6}
                        />
                        <Radar name="Mesafe" dataKey="Mesafe" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                        <Radar name="Enerji" dataKey="Enerji" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
                        <Radar name="Hız" dataKey="Hız" stroke="#ff7300" fill="#ff7300" fillOpacity={0.6} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="table" className="space-y-4">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-300 px-4 py-2 text-left">Algoritma</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Tamamlanma (%)</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Mesafe</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Enerji</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Süre (ms)</th>
                          <th className="border border-gray-300 px-4 py-2 text-left">Genel Skor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metrics.map((metric, index) => {
                          const generalScore =
                            metric.completionRate * 0.4 +
                            (100 - (metric.totalDistance / Math.max(...metrics.map((m) => m.totalDistance))) * 100) *
                              0.3 +
                            (100 -
                              (metric.energyConsumption / Math.max(...metrics.map((m) => m.energyConsumption))) * 100) *
                              0.2 +
                            (100 - (metric.executionTime / Math.max(...metrics.map((m) => m.executionTime))) * 100) *
                              0.1

                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-4 py-2 font-medium">{metric.algorithm}</td>
                              <td className="border border-gray-300 px-4 py-2">
                                <Badge variant={metric.completionRate > 80 ? "default" : "secondary"}>
                                  {metric.completionRate.toFixed(1)}%
                                </Badge>
                              </td>
                              <td className="border border-gray-300 px-4 py-2">{metric.totalDistance.toFixed(2)}</td>
                              <td className="border border-gray-300 px-4 py-2">
                                {metric.energyConsumption.toFixed(2)}
                              </td>
                              <td className="border border-gray-300 px-4 py-2">{metric.executionTime.toFixed(2)}</td>
                              <td className="border border-gray-300 px-4 py-2">
                                <Badge
                                  variant={generalScore > 70 ? "default" : generalScore > 50 ? "secondary" : "outline"}
                                >
                                  {generalScore.toFixed(1)}
                                </Badge>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Algorithm Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Algoritma Önerileri</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-green-700">Gerçek Zamanlı Uygulamalar</h4>
                  <p className="text-sm text-gray-600">
                    Hızlı karar verme gereken durumlar için A* algoritması önerilir.
                  </p>
                  <Badge variant="outline">A* Algorithm</Badge>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-blue-700">Kısıt Yoğun Problemler</h4>
                  <p className="text-sm text-gray-600">
                    Katı kısıtları olan küçük-orta ölçekli problemler için CSP önerilir.
                  </p>
                  <Badge variant="outline">CSP Algorithm</Badge>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-purple-700">Kalite Odaklı Optimizasyon</h4>
                  <p className="text-sm text-gray-600">
                    En iyi çözümü bulmak için zaman ayırabildiğiniz durumlarda Genetik Algoritma önerilir.
                  </p>
                  <Badge variant="outline">Genetic Algorithm</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
