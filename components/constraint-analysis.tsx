"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { AlertTriangle, Shield, Clock, Weight, Zap } from "lucide-react"

interface ConstraintAnalysisProps {
  drones: any[]
  deliveries: any[]
  noFlyZones: any[]
  routes: { [key: number]: number[] }
}

export function ConstraintAnalysis({ drones, deliveries, noFlyZones, routes }: ConstraintAnalysisProps) {
  // Yasak bölge analizi
  const analyzeNoFlyZoneImpact = () => {
    let affectedDeliveries = 0
    let totalNoFlyArea = 0

    deliveries.forEach((delivery) => {
      const isAffected = noFlyZones.some((zone) => {
        // Teslimat noktasının yasak bölgeye yakınlığını kontrol et
        const distance = calculateDistanceToZone(delivery.pos, zone.coordinates)
        return distance < 10 // 10 birim yakınlık eşiği
      })
      if (isAffected) affectedDeliveries++
    })

    noFlyZones.forEach((zone) => {
      totalNoFlyArea += calculateZoneArea(zone.coordinates)
    })

    return {
      affectedDeliveries,
      affectedPercentage: (affectedDeliveries / deliveries.length) * 100,
      totalNoFlyArea,
      mapCoverage: (totalNoFlyArea / 10000) * 100, // 100x100 harita için
    }
  }

  // Kapasite analizi
  const analyzeCapacityConstraints = () => {
    const droneUtilization = drones.map((drone) => {
      const assignedDeliveries = Object.entries(routes)
        .filter(([droneId]) => Number.parseInt(droneId) === drone.id)
        .flatMap(([, deliveryIds]) => deliveryIds)
        .map((id) => deliveries.find((d) => d.id === id))
        .filter(Boolean)

      const totalWeight = assignedDeliveries.reduce((sum, delivery) => sum + delivery.weight, 0)
      const utilization = (totalWeight / drone.max_weight) * 100

      return {
        droneId: drone.id,
        maxWeight: drone.max_weight,
        usedWeight: totalWeight,
        utilization,
        deliveryCount: assignedDeliveries.length,
        isOverloaded: totalWeight > drone.max_weight,
      }
    })

    const overloadedDrones = droneUtilization.filter((d) => d.isOverloaded).length
    const avgUtilization = droneUtilization.reduce((sum, d) => sum + d.utilization, 0) / drones.length

    return {
      droneUtilization,
      overloadedDrones,
      avgUtilization,
      efficiencyScore: avgUtilization > 80 ? "Yüksek" : avgUtilization > 60 ? "Orta" : "Düşük",
    }
  }

  // Zaman penceresi analizi
  const analyzeTimeConstraints = () => {
    const timeViolations = []
    const urgentDeliveries = deliveries.filter((d) => d.priority >= 4)
    const timeWindowAnalysis = deliveries.map((delivery) => {
      const windowSize = delivery.time_window[1] - delivery.time_window[0]
      const urgency = delivery.priority >= 4 ? "Yüksek" : delivery.priority >= 3 ? "Orta" : "Düşük"

      return {
        deliveryId: delivery.id,
        windowSize,
        urgency,
        isUrgent: delivery.priority >= 4,
        isTight: windowSize < 30,
      }
    })

    const tightWindows = timeWindowAnalysis.filter((t) => t.isTight).length
    const urgentCount = urgentDeliveries.length

    return {
      timeWindowAnalysis,
      tightWindows,
      urgentCount,
      urgentPercentage: (urgentCount / deliveries.length) * 100,
      avgWindowSize: timeWindowAnalysis.reduce((sum, t) => sum + t.windowSize, 0) / deliveries.length,
    }
  }

  // Enerji analizi
  const analyzeEnergyConstraints = () => {
    const energyAnalysis = drones.map((drone) => {
      const assignedRoute = routes[drone.id] || []
      let totalDistance = 0
      let currentPos = drone.start_pos

      assignedRoute.forEach((deliveryId) => {
        const delivery = deliveries.find((d) => d.id === deliveryId)
        if (delivery) {
          const distance = calculateDistance(currentPos, delivery.pos)
          totalDistance += distance
          currentPos = delivery.pos
        }
      })

      const energyConsumption = totalDistance * 0.1 // Basit enerji modeli
      const batteryUsage = (energyConsumption / drone.battery) * 100

      return {
        droneId: drone.id,
        battery: drone.battery,
        energyUsed: energyConsumption,
        batteryUsage,
        totalDistance,
        isLowBattery: batteryUsage > 80,
      }
    })

    const lowBatteryDrones = energyAnalysis.filter((e) => e.isLowBattery).length
    const avgBatteryUsage = energyAnalysis.reduce((sum, e) => sum + e.batteryUsage, 0) / drones.length

    return {
      energyAnalysis,
      lowBatteryDrones,
      avgBatteryUsage,
      energyEfficiency: avgBatteryUsage < 60 ? "İyi" : avgBatteryUsage < 80 ? "Orta" : "Kötü",
    }
  }

  const calculateDistance = (pos1: [number, number], pos2: [number, number]): number => {
    return Math.sqrt(Math.pow(pos1[0] - pos2[0], 2) + Math.pow(pos1[1] - pos2[1], 2))
  }

  const calculateDistanceToZone = (point: [number, number], zoneCoords: [number, number][]): number => {
    // En yakın kenar mesafesini hesapla
    let minDistance = Number.POSITIVE_INFINITY
    for (let i = 0; i < zoneCoords.length; i++) {
      const distance = calculateDistance(point, zoneCoords[i])
      minDistance = Math.min(minDistance, distance)
    }
    return minDistance
  }

  const calculateZoneArea = (coords: [number, number][]): number => {
    // Basit dikdörtgen alan hesabı
    if (coords.length < 4) return 0
    const width = Math.abs(coords[1][0] - coords[0][0])
    const height = Math.abs(coords[2][1] - coords[1][1])
    return width * height
  }

  const noFlyAnalysis = analyzeNoFlyZoneImpact()
  const capacityAnalysis = analyzeCapacityConstraints()
  const timeAnalysis = analyzeTimeConstraints()
  const energyAnalysis = analyzeEnergyConstraints()

  return (
    <div className="space-y-6">
      {/* Genel Kısıt Özeti */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Kısıt Analizi Özeti
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <Shield className="h-6 w-6 mx-auto mb-1 text-red-600" />
              <div className="text-lg font-bold text-red-600">{noFlyAnalysis.affectedPercentage.toFixed(1)}%</div>
              <div className="text-xs text-gray-600">Etkilenen Teslimat</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Weight className="h-6 w-6 mx-auto mb-1 text-blue-600" />
              <div className="text-lg font-bold text-blue-600">{capacityAnalysis.avgUtilization.toFixed(1)}%</div>
              <div className="text-xs text-gray-600">Ortalama Kapasite</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <Clock className="h-6 w-6 mx-auto mb-1 text-yellow-600" />
              <div className="text-lg font-bold text-yellow-600">{timeAnalysis.urgentPercentage.toFixed(1)}%</div>
              <div className="text-xs text-gray-600">Acil Teslimat</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <Zap className="h-6 w-6 mx-auto mb-1 text-green-600" />
              <div className="text-lg font-bold text-green-600">{energyAnalysis.avgBatteryUsage.toFixed(1)}%</div>
              <div className="text-xs text-gray-600">Ortalama Batarya</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Yasak Bölge Detay Analizi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Yasak Bölge Etkisi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Etkilenen Teslimat Sayısı:</span>
                <Badge variant="destructive">
                  {noFlyAnalysis.affectedDeliveries}/{deliveries.length}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Harita Kapsamı:</span>
                <span>{noFlyAnalysis.mapCoverage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Toplam Yasak Alan:</span>
                <span>{noFlyAnalysis.totalNoFlyArea.toFixed(0)} birim²</span>
              </div>
            </div>
            <div className="space-y-2">
              <h5 className="font-medium">Bölge Detayları:</h5>
              {noFlyZones.map((zone) => (
                <div key={zone.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span>Bölge {zone.id}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      {zone.active_time[0]}-{zone.active_time[1]}
                    </Badge>
                    <Badge variant={zone.active_time[1] - zone.active_time[0] > 60 ? "destructive" : "secondary"}>
                      {zone.active_time[1] - zone.active_time[0] > 60 ? "Uzun Süreli" : "Kısa Süreli"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kapasite Analizi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Weight className="h-5 w-5" />
            Drone Kapasite Analizi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Aşırı Yüklenmiş Drone:</span>
                <Badge variant={capacityAnalysis.overloadedDrones > 0 ? "destructive" : "secondary"}>
                  {capacityAnalysis.overloadedDrones}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Ortalama Kullanım:</span>
                <span>{capacityAnalysis.avgUtilization.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Verimlilik Skoru:</span>
                <Badge variant={capacityAnalysis.efficiencyScore === "Yüksek" ? "default" : "secondary"}>
                  {capacityAnalysis.efficiencyScore}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <h5 className="font-medium">Drone Kullanım Detayları:</h5>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {capacityAnalysis.droneUtilization.map((drone) => (
                  <div key={drone.droneId} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                    <span>Drone {drone.droneId}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={drone.utilization} className="w-16 h-2" />
                      <span className={drone.isOverloaded ? "text-red-600 font-bold" : ""}>
                        {drone.utilization.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zaman Kısıtları */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Zaman Penceresi Analizi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Acil Teslimatlar:</span>
                <Badge variant="destructive">{timeAnalysis.urgentCount}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Dar Zaman Penceresi:</span>
                <Badge variant="outline">{timeAnalysis.tightWindows}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Ortalama Pencere Süresi:</span>
                <span>{timeAnalysis.avgWindowSize.toFixed(0)} dakika</span>
              </div>
            </div>
            <div className="space-y-2">
              <h5 className="font-medium">Öncelik Dağılımı:</h5>
              {[5, 4, 3, 2, 1].map((priority) => {
                const count = deliveries.filter((d) => d.priority === priority).length
                const percentage = (count / deliveries.length) * 100
                return (
                  <div key={priority} className="flex justify-between items-center">
                    <span>Öncelik {priority}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={percentage} className="w-16 h-2" />
                      <span className="text-sm">{count}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enerji Analizi */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Enerji ve Batarya Analizi
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Düşük Batarya Drone:</span>
                <Badge variant={energyAnalysis.lowBatteryDrones > 0 ? "destructive" : "secondary"}>
                  {energyAnalysis.lowBatteryDrones}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Ortalama Batarya Kullanımı:</span>
                <span>{energyAnalysis.avgBatteryUsage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Enerji Verimliliği:</span>
                <Badge variant={energyAnalysis.energyEfficiency === "İyi" ? "default" : "secondary"}>
                  {energyAnalysis.energyEfficiency}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <h5 className="font-medium">Drone Enerji Durumu:</h5>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {energyAnalysis.energyAnalysis.map((drone) => (
                  <div key={drone.droneId} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                    <span>Drone {drone.droneId}</span>
                    <div className="flex items-center gap-2">
                      <Progress value={drone.batteryUsage} className="w-16 h-2" />
                      <span className={drone.isLowBattery ? "text-red-600 font-bold" : ""}>
                        {drone.batteryUsage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
