# drone_delivery

Bu proje kapsamında, enerji limitleri ve uçuş yasağı bölgeleri (no-fly zone) gibi dinamik kısıtlar
altında çalışan drone'lar için en uygun teslimat rotalarının belirlenmesini sağlayan bir
algoritmanın tasarlanması hedeflenmektedir. Teslimat noktaları, drone özellikleri ve
operasyonel kısıtlar projeye özgü olarak tanımlanmakta ve gerektiğinde rastgele olarak
üretilebilecek esnek bir yapı sunulmaktadır. Böylece, gerçek zamanlı koşullarda drone filo
yönetimi için yenilikçi ve uyarlanabilir bir çözüm geliştirilmesi amaçlanmaktadır.
PROBLEM
Teslimat hizmeti sunan bir lojistik firması, farklı ağırlık ve öncelik seviyelerine sahip paketleri,
çok sayıda drone ile kısa sürede ve verimli bir şekilde ulaştırmak istemektedir. Ancak, teslimat
rotalarının belirlenmesinde enerji kısıtları, uçuş yasağı bölgeleri ve dinamik değişkenler gibi
birçok karmaşık etken söz konusudur. Bu proje, söz konusu firmanın ihtiyacı olan rota
planlamasını en uygun şekilde gerçekleştirecek ve değişen çevresel koşullara hızlı uyum
sağlayacak bir algoritma geliştirmeyi amaçlamaktadır.
1. Veri Yapılarını ve Kısıtları Tanımlama
Drone Özellikleri
 id: Drone'un benzersiz kimlik numarası (integer).
 max_weight: Drone'un taşıyabileceği maksimum ağırlık (kg cinsinden float).
 battery: Drone'un batarya kapasitesi (mAh cinsinden integer).
 speed: Drone'un hızı (m/s cinsinden float).
 start_pos: Drone'un başlangıç koordinatları (x, y) metre cinsinden tuple.
Teslimat Noktaları
 id: Teslimat noktasının benzersiz kimlik numarası (integer).
 pos: Teslimatın yapılacağı koordinatlar (x, y) metre cinsinden tuple.
 weight: Paketin ağırlığı (kg cinsinden float).
 priority: Teslimatın öncelik seviyesi (1: düşük, 5: yüksek).
 time_window: Teslimatın kabul edilebilir zaman aralığı (09:00, 10:00).
2
No-Fly Zone'lar (Uçuşa Yasak Bölgeler)
 id: Bölgenin benzersiz kimlik numarası (integer).
 coordinates: Bölgenin köşe noktaları, [(x1,y1), (x2,y2), … ]
 active_time: Bölgenin aktif olduğu zaman aralığı (09:30, 11:00).
2. Algoritma Tasarımı
Graf Oluşturma
Teslimat noktalarını düğüm (node), drone hareketlerini kenar (edge) olarak modelleyin.
maliyet fonksiyonu(cost) = distance*weight+(priority*100)
Açıklama: Uzaklık ve taşıma ağırlığına dayalı maliyete, teslimat önceliğine göre ağırlıklı
bir ceza eklenmektedir.
A* Algoritması ile Rota Bulma
heuristic = distance +nofly_zone_penalty
Açıklama: A* algoritmasında kullanılacak tahmin fonksiyonu, hedefe olan mesafe ile uçuş
yasağı bölgelerine girme durumunda uygulanacak cezayı içermektedir.
Dikkat: Drone kapasitesini aşan rotaları eleyin.
3. Dinamik Kısıtlar İçin CSP
Değişkenler: Dronelar ve teslimatlar
Kısıtlar: Bir drone aynı anda tek bir paket taşır ve bu dronelar uçuşa yasak bölgeleri ihlal
edemez.
4. Optimizasyon
Genetic Algorithm (GA)
Başlangıç popülasyonu: Rastgele oluşturulmuş geçerli rotalar.
Çaprazlama (Crossover): İki rotadan yeni rota üret.
Mutasyon: Rastgele bir teslimat noktasını değiştir.
fitness = teslimat sayısı*50 ) - (toplam enerji *0.1)-(ihlal edilen kısıt* 1000)
Açıklama: Yüksek teslimat sayısı ödüllendirilirken, yüksek enerji tüketimi ve kural
ihlalleri cezalandırılmaktadır.

3
5. Test ve Performans Analizi
Senaryo 1: 5 drone, 20 teslimat, 2 no-fly zone.
Senaryo 2: 10 drone, 50 teslimat, 5 dinamik no-fly zone.
Metrikler
o Tamamlanan teslimat yüzdesi,
o Ortalama enerji tüketimi,
o Algoritma çalışma süresi.
6. Dikkat Edilecek Hususlar
Graf için komşuluk listesi kullanın (sparse matrislerde verimli).
Acil teslimatlar için Min-Heap kullanın.
Drone'ların şarj süresini hesaba katın.
7. Çıktılar
Kod
A* + CSP ve GA implementasyonu.
Veri üreteci (rastgele drone/teslimat/no-fly zone oluşturma)
Rapor
Algoritmaların karşılaştırılmasını içermelidir (A* vs. GA).
Zaman karmaşıklığı analizi içermelidir.
Görselleştirme
Teslimat rotalarını gösteren bir harita oluşturulmalıdır (Matplotlib veya Leaflet.js).
8. Değerlendirme
Özgünlük: Dinamik no-fly zone ve çoklu optimizasyon.
Verimlilik: 50+ teslimat noktasında < 1 dakika çalışma süresi.
Kod Kalitesi: Modüler yapı ve açıklayıcı yorumlar. 
