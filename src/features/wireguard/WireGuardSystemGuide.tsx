import type { WireGuardRelay } from "./types";

type Props = {
  relay: WireGuardRelay;
};

export default function WireGuardSystemGuide({ relay }: Props) {
  return (
    <details className="wireguard-guide">
      <summary>
        <span>
          <strong>Как устроен VPN и маршрутизация</strong>
          <small>Путь пакета, выбор страны, два exit-а, failover и метрики</small>
        </span>
      </summary>
      <div className="wireguard-guide__body">
        <section>
          <h2>Путь запроса</h2>
          <ol className="wireguard-guide__flow">
            <li><b>Устройство</b><span>Стандартный WireGuard-профиль</span></li>
            <li><b>utils · {relay.interfaceName}</b><span>Вход VPN и адрес устройства из {relay.clientCidr}</span></li>
            <li><b>Country router</b><span>Выбор Internal или External по IP назначения</span></li>
            <li><b>Интернет</b><span>Прямой выход utils либо выбранный AWG exit</span></li>
          </ol>
          <p>
            Устройство подключается по UDP к <code>{relay.publicEndpoint}</code>. На utils трафик входит через
            <code> {relay.interfaceName}</code>, после чего policy routing выбирает один из двух путей. Ответный
            трафик возвращается тем же маршрутом и затем шифруется обратно в WireGuard-туннель устройства.
          </p>
        </section>

        <section>
          <h2>Internal и External</h2>
          <p>
            <b>Internal</b> — российские публичные IPv4-сети. Они совпадают с валидированными RU-префиксами и
            выходят напрямую через обычный интерфейс utils. <b>External</b> — всё остальное; этот трафик попадает
            в отдельную policy table и идёт через активный AmneziaWG exit.
          </p>
          <p>
            Решение принимается по IP, а не по имени сайта. Поэтому домен российской компании на зарубежном CDN
            может попасть в External, а иностранный домен с российским CDN-адресом — в Internal. Список RU-префиксов
            обновляется атомарно раз в сутки: невалидная загрузка не заменяет последний рабочий набор.
          </p>
        </section>

        <section>
          <h2>Два exit-а и автоматическое переключение</h2>
          <p>
            На utils одновременно подняты <code>awg-exit</code> и <code>awg-exit-b</code>. Первый — основной,
            второй — резервный у независимого провайдера. Проверка запускается каждые 5 секунд и сверяет наличие
            интерфейса, свежесть handshake и фактический публичный IP выхода.
          </p>
          <p>
            После <b>трёх последовательных сбоев</b> основного exit-а маршрут переключается на резервный примерно
            за 15 секунд. Когда основной снова проходит <b>две последовательные проверки</b>, система возвращается
            на него примерно за 10 секунд. Во время неопределённости и при отказе обоих exit-ов действует
            unreachable-маршрут: External-трафик блокируется, а не вытекает напрямую через utils.
          </p>
        </section>

        <section>
          <h2>DNS и отсутствие зависимости от exit-а</h2>
          <p>
            DNS клиентов перехватывается только внутри VPN и обслуживается локальным dnsmasq на utils. Это работает
            и для старых профилей с внешним DNS: запросы не обязаны сначала пройти через AWG. Сам country router всё
            равно классифицирует уже полученный IP-адрес назначения.
          </p>
        </section>

        <section>
          <h2>Что именно показывает эта страница</h2>
          <ul>
            <li>Relay-agent раз в 15 секунд сохраняет handshake, счётчики, текущие скорости и состояние маршрутов.</li>
            <li>Страница раз в 3 секунды получает один batched snapshot: relay, все устройства и превью их трафика.</li>
            <li>Подробная история одного устройства загружается отдельно только при открытии его графика.</li>
            <li>Internal quality измеряет путь utils → интернет напрямую; External quality — базовый путь utils → активный exit.</li>
            <li>Трафик учитывается на уровне пересылаемых IP-пакетов, поэтому немного отличается от зашифрованных WireGuard-счётчиков.</li>
          </ul>
        </section>

        <section>
          <h2>Компоненты системы</h2>
          <dl className="wireguard-guide__components">
            <div><dt><code>{relay.interfaceName}</code></dt><dd>WireGuard-вход для устройств</dd></div>
            <div><dt><code>awg-exit</code></dt><dd>Основной AmneziaWG-выход</dd></div>
            <div><dt><code>awg-exit-b</code></dt><dd>Резервный AmneziaWG-выход</dd></div>
            <div><dt>Failover timer</dt><dd>Проверка exit-ов, hysteresis и выбор policy route</dd></div>
            <div><dt>Geo updater</dt><dd>Безопасное обновление набора RU-префиксов</dd></div>
            <div><dt>Relay agent</dt><dd>Применение peer-конфига и отправка health/traffic snapshot</dd></div>
          </dl>
        </section>
      </div>
    </details>
  );
}
