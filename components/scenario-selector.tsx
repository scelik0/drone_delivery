"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings, Users, MapPin, Shield } from "lucide-react"

interface ScenarioSelectorProps {
  currentScenario: string
  onScenarioChange: (scenario: string) => void
  drones: any[]
  deliveries: any[]
  noFlyZones: any[]
}

export function ScenarioSelector({
  currentScenario,
  onScenarioChange,
  drones,
  deliveries,
  noFlyZones,
}: ScenarioSelectorProps) {
  const scenarios = {
    scenario1: {
      name: "Senaryo 1 - Temel Test",
      description: "5 drone, 20 teslimat noktası, 2 statik yasak bölge",
      complexity: "Düşük",
      droneCount: 5,
      deliveryCount: 20,
      noFlyZoneCount: 2,
      characteristics: [
        "Verilen veri setine göre temel senaryo",
        "2 statik yasak bölge",
        "Temel kısıt optimizasyonu",
        "Yasak bölge kaçınma algoritması",
      ],
    },
    scenario2: {
      name: "Senaryo 2 - Gelişmiş Test",
      description: "10 drone, 50 teslimat noktası, 5 dinamik yasak bölge",
      complexity: "Yüksek",
      droneCount: 10,
      deliveryCount: 50,
      noFlyZoneCount: 5,
      characteristics: [
        "Verilen veri setinin genişletilmiş versiyonu",
        "5 dinamik yasak bölge (hareket eden)",
        "Karmaşık kısıt optimizasyonu",
        "Gelişmiş yasak bölge kaçınma sistemi",
      ],
    },
  }

  const currentScenarioData = scenarios[currentScenario as keyof typeof scenarios]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Test Senaryosu Seçimi
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Senaryo Seçici */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Aktif Senaryo:</label>
            <Select value={currentScenario} onValueChange={onScenarioChange}>
              <SelectTrigger>
                <SelectValue placeholder="Senaryo seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scenario1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Temel</Badge>
                    Senaryo 1
                  </div>
                </SelectItem>
                <SelectItem value="scenario2">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Gelişmiş</Badge>
                    Senaryo 2
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Senaryo Bilgileri */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Karmaşıklık:</span>
              <Badge variant={currentScenarioData.complexity === "Düşük" ? "secondary" : "destructive"}>
                {currentScenarioData.complexity}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">{currentScenarioData.description}</p>
          </div>
        </div>

        {/* Mevcut Senaryo Detayları */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">{currentScenarioData.name}</h4>

          {/* Metrikler */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Users className="h-6 w-6 mx-auto mb-1 text-blue-600" />
              <div className="text-lg font-bold text-blue-600">{drones.length}</div>
              <div className="text-xs text-gray-600">Drone</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <MapPin className="h-6 w-6 mx-auto mb-1 text-green-600" />
              <div className="text-lg font-bold text-green-600">{deliveries.length}</div>
              <div className="text-xs text-gray-600">Teslimat</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <Shield className="h-6 w-6 mx-auto mb-1 text-red-600" />
              <div className="text-lg font-bold text-red-600">{noFlyZones.length}</div>
              <div className="text-xs text-gray-600">Yasak Bölge</div>
            </div>
          </div>

          {/* Özellikler */}
          <div className="space-y-2">
            <h5 className="text-sm font-medium">Senaryo Özellikleri:</h5>
            <ul className="text-sm text-gray-600 space-y-1">
              {currentScenarioData.characteristics.map((char, index) => (
                <li key={index} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  {char}
                </li>
              ))}
            </ul>
          </div>

          {/* Yasak Bölge Durumu */}
          {currentScenario === "scenario2" && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Dinamik Yasak Bölgeler</span>
              </div>
              <p className="text-xs text-yellow-700">
                Bu senaryoda yasak bölgeler zaman içinde hareket eder. Drone'lar bu hareketli bölgeleri gerçek zamanlı
                olarak takip ederek güvenli rotalar planlar.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
