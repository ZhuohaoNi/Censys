Platform Host Dataset

Censys offers a comprehensive view of internet-connected assets through its Platform dataset. At the core of this dataset are hosts, which represent individual IP addresses (IPv4 or IPv6) and their associated information. This article delves into the host data model within the Censys Platform, illustrating how hosts and their services are represented and the rich data they encompass.

In the Censys Platform, a host is defined by a unique IP address, represented as the top-level field host.ip. Each host record encapsulates various data points describing the host's characteristics and behaviors. These records are accessible via the Censys Platform interface and API, providing users with detailed insights into the attributes of each host.


An example host record for 8.8.8.8 in the Censys Platform web interface.

📘
Note
Read this article to learn about how Censys scans the internet to build its datasets.

Host data model and enrichment
The host data model is structured to provide a comprehensive overview of each IP address and is enriched with information from Censys and third-party sources. Host data records can consist of multiple objects and nested objects that describe them and the services present on them.


A simplified diagram showing the schema structure and hierarchy for a small selection of host data objects and fields and how they are presented in the Censys Platform.

Key components and enrichment aspects of a host record include:

Location: Detailed geographical information associated with the IP address, such as country, region, city, postal code, and estimated latitude and longitude. This allows for understanding the physical distribution of assets.
Network routing: Information about the network path to the host, including Autonomous System Numbers (ASNs) and the organizations that own these networks. This is crucial for understanding network infrastructure and identifying potential points of origin or control.
DNS information: Resolution of IP addresses to associated domain names (forward DNS lookups) and identification of PTR records (reverse DNS lookups), providing valuable context about the purpose and ownership of a host.
Operating system details: Censys attempts to identify the operating system running on the host based on network behavior and service banners, which is crucial for understanding the host's configuration and potential vulnerabilities.
WHOIS: Information about registered domain names, IP addresses, and their owners or administrators.
Services: A list of services detected on the host, including software information when available.
📘
Note
See all available data objects and fields for host records on the Data Definitions page in the Platform web console.

Nested objects and nested fields
On host records, some data objects and fields are nested within other objects.

When writing queries in Censys Query Language, you can use nested fields to require that multiple search criteria are true of a single object on a data record (like a service), instead of the host, web property, or certificate as a whole. For example, you can use nested fields in a query to only return results that are presenting a specific service on specific port, such as with the query host.services: (protocol=SSH and port=22).

Service information
Host service objects (host.services) contain detailed information about the protocols running on an IP. Each service contains some common information, such as identified software and hardware, TLS and certificate information, labels, and other metadata.

In addition to plain text names, Common Platform Enumeration (CPE) values are also provided for software and hardware and their components.

📘
Note
Some data fields are restricted. They are only available to users that are on a paid Censys Platform tier or have access to specific Platform modules or datasets. If you see a 🔒 lock icon by a field or value, it means that you must upgrade to view the data. Learn more about paid Platform plans.

Many services contain highly detailed protocol-specific information. This protocol-specific information is found in a nested object with the same name as the protocol. For example, SSH-specific information can be found within host.services.ssh.

Unidentified protocols are reported with UNKNOWN values. This can be because the service is not adhering to a protocol or because the protocol is very uncommon and Censys does not yet have a protocol-specific scanner written for it.

HTTP services use a different representation of protocol-specific data. HTTP service data can be found at host.services.endpoints. Each endpoint offers information about a web application or HTTP GET response for a specific URI. To access web application information, use host.services.endpoints.[application_type], such as host.services.endpoints.prometheus. To access HTTP GET information, use host.services.endpoints.http.

Examples of other useful service data fields include:

host.services.port: The network port on which the service is running (such as 80 or 443).
host.services.protocol: The protocol used by the service (for example, HTTP, HTTPS, SSH).
host.services.banner: A string returned by the service, often containing version information or a welcome message.
host.services.scan_time: When the service was last observed by a Censys scan.
Protocol-specific objects and their attendant fields (host.services.ssh, host.services.rdp, and so on): Detailed, parsed information depending on the protocol (such as TLS/SSL certificate details for HTTPS, HTTP banner and server software for HTTP, SSH banner and algorithms for SSH).
host.services.software: Information about the software identified on the service, including name, version, and vendor, often in the Common Platform Enumeration (CPE) format.
Additional contextual data about software including components and life cycle information is available to Platform Enterprise customers (see below).
Host service HTTP header and body information (host.services.endpoints.http.headers and host.services.endpoints.http.body, as well as hash fields).
Note that only the first 2 kilobytes of HTTP headers and bodies are indexed and searchable in the Platform.
These fields help identify the nature of the services on a host and can be used to detect outdated software, misconfigurations, or potential vulnerabilities.

Software context
Platform Enterprise customers have access to additional data about service software. This includes information about software components (host.services.software.components) as well as life cycle information (host.services.software.life_cycle and host.services.software.components.life_cycle).

You can use component information to find software that has potentially vulnerable components. For example, you can run the query host.services: (software.components.product = "nginx" and not software.product = "nginx") to find service software that is using nginx components but is not itself detected as nginx.

Software confidence
Software confidence in the Censys Platform measures how reliably Censys identifies service software and versions on assets. Confidence scores range from 0 (low) to 1 (high) and help users assess the likelihood of false positives in detected software fingerprints.

For host service software, the confidence level is provided in the host.services.software.confidence field. Exact matches of known, structured fields such as exact favicon hashes, HTTP body hashes, or banner content hashes may yield a high confidence value, whereas HTTP endpoint regex matches, body regex matches, or single-field keyword-based recognition may yield a low to moderate confidence value.

Confidence levels do not currently impact CVE (vulnerability) scoring. Software confidence fields are available exclusively to Enterprise-tier users.

Host HTTP services as web endpoints
Host HTTP services in Censys datasets are also present as web property endpoints. For example, a host HTTP service operating on port 443 on the host 1.1.1.1 will also have an attendant web property record available at 1.1.1.1:443.

Service CVE and vulnerability data
Users on the Enterprise plan have access to Common Vulnerabilities and Exposures (CVE) data for host services in the host.services.vulns object. This information includes CVE IDs (host.services.vulns.id), CVSS scores (host.services.vulns.metrics.cvss_v40.score and others), whether the vulnerability is present in the Known Exploited Vulnerability (KEV) catalog (host.services.vulns.kev) and many other vulnerability data fields.

The Data Definitions page contains a complete list of CVE and vulnerability data for host services.

📘
Note
Services and endpoints in the Censys datasets can have a maximum of 50 CVEs.

CVE data in the Platform web UI
Host services that are associated with CVEs have an alert icon next to them in host preview cards and on host record pages.


Three services with CVEs highlighted on an example host preview card.

Additional CVE information is shown on service cards on host record pages.


A detailed list of all the of CVEs present on a host's services is shown on the host's CVEs tab.


Additionally, all vulnerability data for for a host service is available in the raw data output.

CVE search result filters
If you have access to CVE data, CVE-related information like CVE ID and CVSS score are available in the quick filters in the left-side toolbar for search result pages.


Example queries for vulnerability data
Use the following queries to explore vulnerability data in the Platform.

Query description and link	Query syntax
Hosts with services with critical CVEs that are KEVs	host.services.vulns: (severity=CRITICAL and kev: *)
Host with services with easily exploitable CVEs	host.services.vulns.metrics.cvss_v30.components.attack_complexity=LOW or host.services.vulns.metrics.cvss_v31.components.attack_complexity=LOW or host.services.vulns.metrics.cvss_v40.components.attack_complexity=LOW
Host with services vulnerable to a specific CVE ID, such as CVE-2019-14540	host.services.vulns.id="CVE-2019-14540"
Host running services with critical CVEs that an unauthenticated attacker can easily exploit	host.services.vulns: (metrics.cvss_v31.score>=9 and metrics.cvss_v31.components.attack_complexity=LOW and metrics.cvss_v31.components.privileges_required=NONE)
Labels
Labels on services (host.services.labels) are used to categorically describe the services present on hosts. Label values are always in screaming snake case. Examples include:

LOGIN_PAGE
OPEN_DIRECTORY
WAF
DEFAULT_LANDING_PAGE
Example host record
The following is an example of a host record obtained via API to illustrate the data structure. This record indicates that the host at IP address 137.220.232.142 is located in Tokyo, Japan, belongs to ASN 152194, and has an SSH service running on port 22.

JSON

{
  "result": {
    "resource": {
      "ip": "137.220.232.142",
      "location": {
        "continent": "Asia",
        "country": "Japan",
        "country_code": "JP",
        "city": "Tokyo",
        "postal_code": "101-8656",
        "timezone": "Asia/Tokyo",
        "province": "Tokyo",
        "coordinates": {
          "latitude": 35.6895,
          "longitude": 139.69171
        }
      },
      "autonomous_system": {
        "asn": 152194,
        "description": "CTGSERVERLIMITED-AS-AP CTG Server Limited",
        "bgp_prefix": "137.220.232.0/24",
        "name": "CTGSERVERLIMITED-AS-AP CTG Server Limited",
        "country_code": "HK"
      },
      "whois": {
        "network": {
          "handle": "CTG220-192-JP",
          "name": "CTG Server Ltd.",
          "cidrs": [
            "137.220.192.0/18"
          ],
          "updated": "2022-03-30T00:00:00Z"
        }
      },
      "services": [
        {
          "port": 22,
          "protocol": "SSH",
          "transport_protocol": "tcp",
          "software": [
            {
              "source": "censys",
              "confidence": 0.9,
              "evidence": [
                {
                  "data_path": "protocol",
                  "found_value": "SSH",
                  "literal_match": "SSH"
                }
              ],
              "type": [
                "REMOTE_ACCESS"
              ],
              "part": "a"
            },
            {
              "source": "censys",
              "confidence": 0.9,
              "evidence": [
                {
                  "data_path": "protocol",
                  "found_value": "SSH",
                  "literal_match": "SSH"
                }
[truncated for brevity]
}
Frequently-used data on host records
Beyond basic service information, host records contain several high-value objects, nested objects, and attendant fields that provide deeper insights for security assessments, compliance checks, and threat intelligence gathering. The following are just a few examples.

Object or field	Description
host.location	Detailed geographical data, useful for mapping and regional analysis.
host.services.banner	A string returned by the service, often containing version information or a welcome message. Hashed versions of this information is provided in host.services.banner_hash_sha256 and host.services.banner_hex.
host.services.software	Information about the software identified on the service, including the product name (host.services.software.product), vendor (host.services.software.vendor), version (host.services.software.version), and software components (host.services.software.components). Software values in plain language and CPE format (host.services.software.cpe) are provided in this object.
host.services.cert	Details about the certificate used for a service, including subject, issuer, validity period, and subject information. Service certificate information, such as the certificate SHA-256 hash contained in host.services.cert.fingerprint_sha256, is particularly useful for pivoting to related web infrastructure using the same certificate (in the present or historically ).