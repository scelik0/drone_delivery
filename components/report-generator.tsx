"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, FileText, BarChart3 } from "lucide-react"

interface ReportGeneratorProps {
  results: any[]
  drones: any[]
  deliveries: any[]
  noFlyZones: any[]
  currentScenario: string
}

export function ReportGenerator({ results, drones, deliveries, noFlyZones, currentScenario }: ReportGeneratorProps) {
  const generateDetailedReport = (): string => {
    const timestamp = new Date().toLocaleString("tr-TR")
    const scenarioName = currentScenario === "scenario1" ? "Senaryo 1 - Temel Test" : "Senaryo 2 - Gelişmiş Test"

    let report = `
DRONE TESLİMAT ROTA OPTİMİZASYONU RAPORU
=============================================

Rapor Tarihi: ${timestamp}
Test Senaryosu: ${scenarioName}
Sistem Versiyonu: v1.0

SENARYO BİLGİLERİ
================
• Toplam Drone Sayısı: ${drones.length}
• Toplam Teslimat Noktası: ${deliveries.length}
• Yasak Bölge Sayısı: ${noFlyZones.length}

DRONE FİLOSU DETAYLARI
=====================
`

    drones.forEach((drone) => {
      report += `
Drone ${drone.id}:
  - Maksimum Ağırlık: ${drone.max_weight} kg
  - Batarya Kapasitesi: ${drone.battery} mAh
  - Hız: ${drone.speed} m/s
  - Başlangıç Pozisyonu: (${drone.start_pos[0]}, ${drone.start_pos[1]})
`
    })

    report += `
TESLİMAT NOKTALARI ANALİZİ
=========================
`

    // Öncelik dağılımı
    const priorityDistribution = [1, 2, 3, 4, 5].map((priority) => ({
      priority,
      count: deliveries.filter((d) => d.priority === priority).length,
    }))

    priorityDistribution.forEach(({ priority, count }) => {
      const percentage = ((count / deliveries.length) * 100).toFixed(1)
      report += `Öncelik ${priority}: ${count} teslimat (${percentage}%)\n`
    })

    // Ağırlık analizi
    const totalWeight = deliveries.reduce((sum, d) => sum + d.weight, 0)
    const avgWeight = totalWeight / deliveries.length
    const maxWeight = Math.max(...deliveries.map((d) => d.weight))
    const minWeight = Math.min(...deliveries.map((d) => d.weight))

    report += `
Ağırlık İstatistikleri:
  - Toplam Ağırlık: ${totalWeight.toFixed(2)} kg
  - Ortalama Ağırlık: ${avgWeight.toFixed(2)} kg
  - Maksimum Ağırlık: ${maxWeight} kg
  - Minimum Ağırlık: ${minWeight} kg

YASAK BÖLGELER
==============
`

    noFlyZones.forEach((zone) => {
      const duration = zone.active_time[1] - zone.active_time[0]
      report += `
Yasak Bölge ${zone.id}:
  - Aktif Süre: ${zone.active_time[0]} - ${zone.active_time[1]} dakika (${duration} dk)
  - Koordinatlar: ${zone.coordinates.map((coord) => `(${coord[0]},${coord[1]})`).join(", ")}
  - Durum: ${duration > 60 ? "Uzun Süreli" : "Kısa Süreli"}
`
    })

    if (results.length > 0) {
      report += `
ALGORİTMA SONUÇLARI
==================
`

      results.forEach((result) => {
        const completionRate = ((result.completed_deliveries / deliveries.length) * 100).toFixed(1)

        report += `
${result.algorithm}:
  - Tamamlanan Teslimat: ${result.completed_deliveries}/${deliveries.length} (${completionRate}%)
  - Toplam Mesafe: ${result.total_distance.toFixed(2)} birim
  - Enerji Tüketimi: ${result.energy_consumption.toFixed(2)} birim
  - Çalışma Süresi: ${result.execution_time.toFixed(2)} ms
  - Aktif Drone Sayısı: ${Object.keys(result.routes).length}

  Drone Rotaları:
`

        Object.entries(result.routes).forEach(([droneId, deliveryIds]) => {
          const drone = drones.find((d) => d.id === Number.parseInt(droneId))
          const routeWeight = deliveryIds.reduce((sum, id) => {
            const delivery = deliveries.find((d) => d.id === id)
            return sum + (delivery ? delivery.weight : 0)
          }, 0)

          report += `    Drone ${droneId}: ${deliveryIds.length} teslimat, ${routeWeight.toFixed(1)} kg\n`
          report += `      Rota: ${deliveryIds.map((id) => `T${id}`).join(" → ")}\n`
        })

        report += "\n"
      })

      // Karşılaştırmalı analiz
      if (results.length > 1) {
        report += `
KARŞILAŞTIRMALI ANALİZ
=====================

En İyi Performans Metrikleri:
`

        const bestCompletion = results.reduce((best, current) =>
          current.completed_deliveries > best.completed_deliveries ? current : best,
        )

        const bestDistance = results.reduce((best, current) =>
          current.total_distance < best.total_distance ? current : best,
        )

        const bestEnergy = results.reduce((best, current) =>
          current.energy_consumption < best.energy_consumption ? current : best,
        )

        const bestTime = results.reduce((best, current) =>
          current.execution_time < best.execution_time ? current : best,
        )

        report += `• En Yüksek Tamamlanma Oranı: ${bestCompletion.algorithm} (${((bestCompletion.completed_deliveries / deliveries.length) * 100).toFixed(1)}%)\n`
        report += `• En Kısa Toplam Mesafe: ${bestDistance.algorithm} (${bestDistance.total_distance.toFixed(2)} birim)\n`
        report += `• En Az Enerji Tüketimi: ${bestEnergy.algorithm} (${bestEnergy.energy_consumption.toFixed(2)} birim)\n`
        report += `• En Hızlı Çalışma: ${bestTime.algorithm} (${bestTime.execution_time.toFixed(2)} ms)\n`
      }
    }

    report += `
KISIT ANALİZİ
=============

Kapasite Kısıtları:
`

    const totalDroneCapacity = drones.reduce((sum, d) => sum + d.max_weight, 0)
    const totalDeliveryWeight = deliveries.reduce((sum, d) => sum + d.weight, 0)
    const capacityUtilization = ((totalDeliveryWeight / totalDroneCapacity) * 100).toFixed(1)

    report += `• Toplam Drone Kapasitesi: ${totalDroneCapacity} kg\n`
    report += `• Toplam Teslimat Ağırlığı: ${totalDeliveryWeight.toFixed(2)} kg\n`
    report += `• Kapasite Kullanım Oranı: ${capacityUtilization}%\n`

    // Zaman penceresi analizi
    const urgentDeliveries = deliveries.filter((d) => d.priority >= 4).length
    const tightWindows = deliveries.filter((d) => d.time_window[1] - d.time_window[0] < 30).length

    report += `
Zaman Kısıtları:
• Acil Teslimatlar (Öncelik 4-5): ${urgentDeliveries} (${((urgentDeliveries / deliveries.length) * 100).toFixed(1)}%)
• Dar Zaman Penceresi (<30 dk): ${tightWindows}
• Ortalama Zaman Penceresi: ${(deliveries.reduce((sum, d) => sum + (d.time_window[1] - d.time_window[0]), 0) / deliveries.length).toFixed(1)} dakika

Yasak Bölge Etkisi:
• Toplam Yasak Bölge: ${noFlyZones.length}
• Aktif Süre Toplamı: ${noFlyZones.reduce((sum, z) => sum + (z.active_time[1] - z.active_time[0]), 0)} dakika
• Ortalama Aktif Süre: ${(noFlyZones.reduce((sum, z) => sum + (z.active_time[1] - z.active_time[0]), 0) / noFlyZones.length).toFixed(1)} dakika

ÖNERİLER VE SONUÇ
================
`

    if (results.length > 0) {
      const avgCompletion = results.reduce((sum, r) => sum + r.completed_deliveries, 0) / results.length
      const completionRate = (avgCompletion / deliveries.length) * 100

      if (completionRate > 90) {
        report += `✓ Mükemmel performans: Ortalama %${completionRate.toFixed(1)} tamamlanma oranı\n`
      } else if (completionRate > 75) {
        report += `✓ İyi performans: Ortalama %${completionRate.toFixed(1)} tamamlanma oranı\n`
        report += `• Drone kapasitelerini artırmayı düşünün\n`
      } else {
        report += `⚠ Geliştirilmesi gereken performans: Ortalama %${completionRate.toFixed(1)} tamamlanma oranı\n`
        report += `• Daha fazla drone eklemeyi düşünün\n`
        report += `• Yasak bölge etkilerini minimize edin\n`
        report += `• Zaman pencerelerini optimize edin\n`
      }
    }

    report += `
Algoritma Önerileri:
• Gerçek zamanlı uygulamalar için: A* Algoritması (hızlı sonuç)
• Kısıt yoğun problemler için: CSP Algoritması (garantili kısıt tatmini)
• Kalite odaklı optimizasyon için: Genetik Algoritma (global optimum arayışı)

Bu rapor ${timestamp} tarihinde otomatik olarak oluşturulmuştur.
Drone Teslimat Rota Optimizasyonu Sistemi v1.0
`

    return report
  }

  const exportReadableReport = () => {
    const report = generateDetailedReport()
    const dataBlob = new Blob([report], { type: "text/plain; charset=utf-8" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `drone_delivery_report_${currentScenario}_${new Date().toISOString().split("T")[0]}.txt`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportJSONResults = () => {
    const jsonData = {
      timestamp: new Date().toISOString(),
      scenario: currentScenario,
      system_info: {
        drones: drones.length,
        deliveries: deliveries.length,
        noFlyZones: noFlyZones.length,
      },
      results: results,
      raw_data: {
        drones,
        deliveries,
        noFlyZones,
      },
    }

    const dataStr = JSON.stringify(jsonData, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `drone_delivery_data_${currentScenario}_${new Date().toISOString().split("T")[0]}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Rapor Oluşturma
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button onClick={exportReadableReport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Detaylı Rapor İndir (.txt)
          </Button>
          <Button onClick={exportJSONResults} variant="outline" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Ham Veri İndir (.json)
          </Button>
        </div>

        <div className="text-sm text-gray-600 space-y-1">
          <p>
            <strong>Detaylı Rapor:</strong> Okunabilir format, analiz sonuçları ve öneriler içerir
          </p>
          <p>
            <strong>Ham Veri:</strong> JSON format, teknik analiz ve veri işleme için uygundur
          </p>
        </div>

        {results.length > 0 && (
          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">
              ✓ {results.length} algoritma sonucu mevcut. Raporlar güncel verilerle oluşturulacak.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
