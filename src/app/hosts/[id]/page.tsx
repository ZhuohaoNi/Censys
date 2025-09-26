'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Globe, 
  Shield, 
  AlertCircle, 
  Server,
  FileText,
  Download,
  Loader2,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { getRiskColorClass, formatDate } from '@/lib/utils';

interface HostDetails {
  id: string;
  ip: string;
  location: string;
  as_name: string;
  as_number: number;
  risk_level: string;
  risk_score: number;
  services: Array<{
    port: number;
    transport_protocol: string;
    service_name: string;
    software?: {
      type: string;
      name: string;
      version?: string;
    };
    vulnerabilities?: Array<{
      cve_id: string;
      severity: string;
      cvss_score?: number;
      description: string;
    }>;
  }>;
  summary?: {
    technical_summary: string;
    business_impact: string;
    security_recommendations: string[];
    risk_assessment: {
      overall_risk: string;
      key_concerns: string[];
      mitigations_required: boolean;
    };
  };
}

export default function HostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [host, setHost] = useState<HostDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'vulnerabilities' | 'summary'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchHostDetails(params.id as string);
    }
  }, [params.id]);

  const fetchHostDetails = async (id: string) => {
    try {
      const response = await fetch(`/api/hosts/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch host details');
      }
      const data = await response.json();
      setHost(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load host details');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSummary = async () => {
    if (!host) return;
    
    setIsSummarizing(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hostIds: [host.id] }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate summary');
      }
      
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        setHost({ ...host, summary: data.results[0].summary });
        setActiveTab('summary');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary');
    } finally {
      setIsSummarizing(false);
    }
  };

  const copyToClipboard = () => {
    if (host) {
      navigator.clipboard.writeText(JSON.stringify(host, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const exportData = async (format: 'json' | 'markdown') => {
    if (!host) return;
    
    try {
      const response = await fetch(`/api/export?format=${format}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hostIds: [host.id] }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `host-${host.ip.replace(/\./g, '-')}.${format === 'markdown' ? 'md' : 'json'}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!host) {
    return null;
  }

  const vulnerabilityCount = host.services.reduce((acc, service) => 
    acc + (service.vulnerabilities?.length || 0), 0
  );

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/hosts"
            className="inline-flex items-center text-blue-600 hover:text-blue-500 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to hosts
          </Link>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{host.ip}</h1>
              <div className="flex items-center gap-4 text-gray-600">
                <span className="flex items-center gap-1">
                  <Globe className="h-4 w-4" />
                  {host.location}
                </span>
                <span>{host.as_name} (AS{host.as_number})</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`px-4 py-2 rounded-full font-semibold ${getRiskColorClass(host.risk_level)}`}>
                {host.risk_level.toUpperCase()} RISK
              </span>
              <span className="px-4 py-2 bg-gray-100 rounded-full font-semibold">
                Score: {host.risk_score}/100
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-6">
          {!host.summary && (
            <button
              onClick={generateSummary}
              disabled={isSummarizing}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSummarizing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Summary
                </>
              )}
            </button>
          )}
          
          <button
            onClick={() => exportData('json')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </button>
          
          <button
            onClick={() => exportData('markdown')}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Markdown
          </button>
          
          <button
            onClick={copyToClipboard}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Data
              </>
            )}
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {(['overview', 'services', 'vulnerabilities', 'summary'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'services' && ` (${host.services.length})`}
                {tab === 'vulnerabilities' && ` (${vulnerabilityCount})`}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-md p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Host Information</h3>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">IP Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{host.ip}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Location</dt>
                    <dd className="mt-1 text-sm text-gray-900">{host.location}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">AS Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{host.as_name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">AS Number</dt>
                    <dd className="mt-1 text-sm text-gray-900">{host.as_number}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Risk Score</dt>
                    <dd className="mt-1 text-sm text-gray-900">{host.risk_score}/100</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Services</dt>
                    <dd className="mt-1 text-sm text-gray-900">{host.services.length} detected</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <Server className="h-6 w-6 text-blue-600 mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{host.services.length}</p>
                    <p className="text-sm text-gray-600">Active Services</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4">
                    <AlertCircle className="h-6 w-6 text-red-600 mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{vulnerabilityCount}</p>
                    <p className="text-sm text-gray-600">Vulnerabilities</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <Shield className="h-6 w-6 text-green-600 mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{host.risk_score}</p>
                    <p className="text-sm text-gray-600">Risk Score</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'services' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Detected Services</h3>
              <div className="space-y-4">
                {host.services.map((service, idx) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-medium">{service.service_name}</span>
                        <span className="ml-2 text-sm text-gray-500">
                          Port {service.port}/{service.transport_protocol}
                        </span>
                      </div>
                      {service.vulnerabilities && service.vulnerabilities.length > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                          {service.vulnerabilities.length} vulnerabilities
                        </span>
                      )}
                    </div>
                    {service.software && (
                      <p className="text-sm text-gray-600">
                        {service.software.type}: {service.software.name} 
                        {service.software.version && ` v${service.software.version}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'vulnerabilities' && (
            <div>
              <h3 className="text-lg font-semibold mb-4">Vulnerabilities</h3>
              {vulnerabilityCount === 0 ? (
                <p className="text-gray-500">No vulnerabilities detected</p>
              ) : (
                <div className="space-y-4">
                  {host.services.map((service) => 
                    service.vulnerabilities?.map((vuln, idx) => (
                      <div key={`${service.port}-${idx}`} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-medium">{vuln.cve_id}</span>
                            <span className="ml-2 px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                              {vuln.severity}
                            </span>
                            {vuln.cvss_score && (
                              <span className="ml-2 text-sm text-gray-500">
                                CVSS: {vuln.cvss_score}
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">
                            Port {service.port}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{vuln.description}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'summary' && (
            <div>
              {host.summary ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Technical Summary</h3>
                    <p className="text-gray-700">{host.summary.technical_summary}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Business Impact</h3>
                    <p className="text-gray-700">{host.summary.business_impact}</p>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Security Recommendations</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {host.summary.security_recommendations.map((rec, idx) => (
                        <li key={idx} className="text-gray-700">{rec}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Risk Assessment</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="mb-2">
                        <span className="font-medium">Overall Risk:</span>{' '}
                        <span className={`px-2 py-1 rounded ${getRiskColorClass(host.summary.risk_assessment.overall_risk)}`}>
                          {host.summary.risk_assessment.overall_risk.toUpperCase()}
                        </span>
                      </p>
                      <div className="mb-2">
                        <span className="font-medium">Key Concerns:</span>
                        <ul className="list-disc list-inside mt-1">
                          {host.summary.risk_assessment.key_concerns.map((concern, idx) => (
                            <li key={idx} className="text-gray-600">{concern}</li>
                          ))}
                        </ul>
                      </div>
                      <p>
                        <span className="font-medium">Mitigations Required:</span>{' '}
                        <span className={host.summary.risk_assessment.mitigations_required ? 'text-red-600' : 'text-green-600'}>
                          {host.summary.risk_assessment.mitigations_required ? 'Yes' : 'No'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500 mb-4">No summary generated yet</p>
                  <button
                    onClick={generateSummary}
                    disabled={isSummarizing}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSummarizing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Generate Summary
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}