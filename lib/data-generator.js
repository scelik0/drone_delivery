// Rastgele Veri Üretici
export class DataGenerator {
  constructor() {
    this.mapSize = { width: 100, height: 100 }
  }

  generateRandomPosition() {
    return [Math.floor(Math.random() * this.mapSize.width), Math.floor(Math.random() * this.mapSize.height)]
  }

  generateDrones(count = 5) {
    const drones = []

    for (let i = 1; i <= count; i++) {
      drones.push({
        id: i,
        max_weight: Math.round((Math.random() * 4 + 2) * 10) / 10, // 2.0 - 6.0 kg
        battery: Math.floor(Math.random() * 15000 + 8000), // 8000 - 23000 mAh
        speed: Math.round((Math.random() * 8 + 5) * 10) / 10, // 5.0 - 13.0 m/s
        start_pos: this.generateRandomPosition(),
      })
    }

    return drones
  }

  generateDeliveries(count = 20) {
    const deliveries = []

    for (let i = 1; i <= count; i++) {
      const timeStart = Math.floor(Math.random() * 60)
      const timeEnd = timeStart + Math.floor(Math.random() * 60 + 30)

      deliveries.push({
        id: i,
        pos: this.generateRandomPosition(),
        weight: Math.round((Math.random() * 4.5 + 0.5) * 10) / 10, // 0.5 - 5.0 kg
        priority: Math.floor(Math.random() * 5) + 1, // 1-5
        time_window: [timeStart, timeEnd],
      })
    }

    return deliveries
  }

  generateNoFlyZones(count = 3) {
    const zones = []

    for (let i = 1; i <= count; i++) {
      const centerX = Math.floor(Math.random() * (this.mapSize.width - 40)) + 20
      const centerY = Math.floor(Math.random() * (this.mapSize.height - 40)) + 20
      const width = Math.floor(Math.random() * 20) + 10
      const height = Math.floor(Math.random() * 20) + 10

      const timeStart = Math.floor(Math.random() * 60)
      const timeEnd = timeStart + Math.floor(Math.random() * 80 + 40)

      zones.push({
        id: i,
        coordinates: [
          [centerX - width / 2, centerY - height / 2],
          [centerX + width / 2, centerY - height / 2],
          [centerX + width / 2, centerY + height / 2],
          [centerX - width / 2, centerY + height / 2],
        ],
        active_time: [timeStart, timeEnd],
      })
    }

    return zones
  }

  generateScenario(droneCount = 5, deliveryCount = 20, zoneCount = 3) {
    return {
      drones: this.generateDrones(droneCount),
      deliveries: this.generateDeliveries(deliveryCount),
      noFlyZones: this.generateNoFlyZones(zoneCount),
    }
  }

  generateLargeScenario() {
    return this.generateScenario(10, 50, 5)
  }

  generateTestScenarios() {
    return {
      small: this.generateScenario(3, 10, 2),
      medium: this.generateScenario(5, 20, 3),
      large: this.generateScenario(10, 50, 5),
      xlarge: this.generateScenario(15, 100, 8),
    }
  }

  exportToJSON(scenario, filename = "drone_scenario.json") {
    const dataStr = JSON.stringify(scenario, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  exportToText(scenario, filename = "drone_scenario.txt") {
    let content = "# Drone Delivery Scenario\n\n"

    content += "## Drones\n"
    scenario.drones.forEach((drone) => {
      content += `Drone ${drone.id}: Weight=${drone.max_weight}kg, Battery=${drone.battery}mAh, Speed=${drone.speed}m/s, Start=(${drone.start_pos[0]},${drone.start_pos[1]})\n`
    })

    content += "\n## Deliveries\n"
    scenario.deliveries.forEach((delivery) => {
      content += `Delivery ${delivery.id}: Pos=(${delivery.pos[0]},${delivery.pos[1]}), Weight=${delivery.weight}kg, Priority=${delivery.priority}, Time=[${delivery.time_window[0]}-${delivery.time_window[1]}]\n`
    })

    content += "\n## No-Fly Zones\n"
    scenario.noFlyZones.forEach((zone) => {
      content += `Zone ${zone.id}: Active=[${zone.active_time[0]}-${zone.active_time[1]}], Coordinates=${JSON.stringify(zone.coordinates)}\n`
    })

    const dataBlob = new Blob([content], { type: "text/plain" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }
}

// Performans Analizi Sınıfı
export class PerformanceAnalyzer {
  constructor() {
    this.results = []
  }

  addResult(algorithmName, result, executionTime) {
    this.results.push({
      algorithm: algorithmName,
      ...result,
      executionTime: executionTime,
      timestamp: new Date().toISOString(),
    })
  }

  compareAlgorithms() {
    if (this.results.length === 0) return null

    const comparison = {
      best_completion_rate: null,
      best_distance: null,
      best_energy: null,
      best_time: null,
      summary: {},
    }

    this.results.forEach((result) => {
      const completionRate = result.completedDeliveries / 20 // Assuming 20 deliveries

      if (!comparison.best_completion_rate || completionRate > comparison.best_completion_rate.rate) {
        comparison.best_completion_rate = {
          algorithm: result.algorithm,
          rate: completionRate,
        }
      }

      if (!comparison.best_distance || result.totalDistance < comparison.best_distance.distance) {
        comparison.best_distance = {
          algorithm: result.algorithm,
          distance: result.totalDistance,
        }
      }

      if (!comparison.best_energy || result.energyConsumption < comparison.best_energy.energy) {
        comparison.best_energy = {
          algorithm: result.algorithm,
          energy: result.energyConsumption,
        }
      }

      if (!comparison.best_time || result.executionTime < comparison.best_time.time) {
        comparison.best_time = {
          algorithm: result.algorithm,
          time: result.executionTime,
        }
      }

      comparison.summary[result.algorithm] = {
        completionRate: completionRate,
        totalDistance: result.totalDistance,
        energyConsumption: result.energyConsumption,
        executionTime: result.executionTime,
      }
    })

    return comparison
  }

  generateReport() {
    const comparison = this.compareAlgorithms()
    if (!comparison) return "No results to analyze."

    let report = "# Drone Delivery Algorithm Performance Report\n\n"

    report += "## Executive Summary\n"
    report += `- Best Completion Rate: ${comparison.best_completion_rate.algorithm} (${(comparison.best_completion_rate.rate * 100).toFixed(1)}%)\n`
    report += `- Best Distance: ${comparison.best_distance.algorithm} (${comparison.best_distance.distance.toFixed(2)} units)\n`
    report += `- Best Energy Efficiency: ${comparison.best_energy.algorithm} (${comparison.best_energy.energy.toFixed(2)} units)\n`
    report += `- Fastest Execution: ${comparison.best_time.algorithm} (${comparison.best_time.time.toFixed(2)} ms)\n\n`

    report += "## Detailed Results\n\n"

    Object.entries(comparison.summary).forEach(([algorithm, metrics]) => {
      report += `### ${algorithm}\n`
      report += `- Completion Rate: ${(metrics.completionRate * 100).toFixed(1)}%\n`
      report += `- Total Distance: ${metrics.totalDistance.toFixed(2)} units\n`
      report += `- Energy Consumption: ${metrics.energyConsumption.toFixed(2)} units\n`
      report += `- Execution Time: ${metrics.executionTime.toFixed(2)} ms\n\n`
    })

    report += "## Algorithm Analysis\n\n"
    report += "### A* Algorithm\n"
    report += "- **Strengths**: Fast execution, good for real-time applications\n"
    report += "- **Weaknesses**: May not find global optimum, greedy approach\n"
    report += "- **Best Use Case**: Time-critical scenarios with moderate complexity\n\n"

    report += "### CSP Algorithm\n"
    report += "- **Strengths**: Guarantees constraint satisfaction, systematic approach\n"
    report += "- **Weaknesses**: Can be slow for large problems, may not find solution\n"
    report += "- **Best Use Case**: Problems with strict constraints and smaller datasets\n\n"

    report += "### Genetic Algorithm\n"
    report += "- **Strengths**: Can find global optimum, handles complex search spaces\n"
    report += "- **Weaknesses**: Slower execution, requires parameter tuning\n"
    report += "- **Best Use Case**: Complex optimization problems where quality matters more than speed\n\n"

    return report
  }

  exportReport(filename = "performance_report.txt") {
    const report = this.generateReport()
    const dataBlob = new Blob([report], { type: "text/plain" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }
}
