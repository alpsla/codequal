# DeepWiki Initial Investigation Findings

## Environment Details
- **Namespace:** codequal-dev
- **Pod:** deepwiki-779df6764f-fwcrg
- **Investigation Date:** Fri May 16 12:58:08 EDT 2025

## Pod Information
```
Name:             deepwiki-779df6764f-fwcrg
Namespace:        codequal-dev
Priority:         0
Service Account:  default
Node:             pool-2h8livbne-t7xgw/10.116.0.3
Start Time:       Thu, 15 May 2025 11:09:53 -0400
Labels:           app=deepwiki
                  pod-template-hash=779df6764f
Annotations:      kubectl.kubernetes.io/restartedAt: 2025-05-14T22:31:33-04:00
Status:           Running
IP:               10.108.0.70
IPs:
  IP:           10.108.0.70
Controlled By:  ReplicaSet/deepwiki-779df6764f
Containers:
  deepwiki:
    Container ID:   containerd://68c43f81c5df1c92f7fc54aad7c30907f3d28e67a1c037b0122452086d04b550
    Image:          ghcr.io/asyncfuncai/deepwiki-open:latest
    Image ID:       ghcr.io/asyncfuncai/deepwiki-open@sha256:032f296f410917b3bb250c435125d4da990dc42d69dd1e3a4fb07c00299f6cc2
    Ports:          3000/TCP, 8001/TCP
    Host Ports:     0/TCP, 0/TCP
    State:          Running
      Started:      Thu, 15 May 2025 11:10:08 -0400
    Ready:          True
    Restart Count:  0
    Limits:
      cpu:     2
      memory:  4Gi
    Requests:
      cpu:     1
      memory:  2Gi
    Environment Variables from:
      deepwiki-env  Secret  Optional: false
    Environment:
      SERVER_BASE_URL:              http://deepwiki-api:8001
      NEXT_PUBLIC_SERVER_BASE_URL:  http://deepwiki-api:8001
      OPENAI_API_KEY:               <set to the key 'OPENAI_API_KEY' in secret 'openai-api-key'>     Optional: false
      GOOGLE_API_KEY:               <set to the key 'GOOGLE_API_KEY' in secret 'google-ai-api-key'>  Optional: false
      GITHUB_TOKEN:                 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
    Mounts:
      /root/.adalflow from deepwiki-data (rw)
      /var/run/secrets/kubernetes.io/serviceaccount from kube-api-access-g4mkm (ro)
Conditions:
  Type                        Status
  PodReadyToStartContainers   True 
  Initialized                 True 
  Ready                       True 
  ContainersReady             True 
  PodScheduled                True 
Volumes:
  deepwiki-data:
    Type:       PersistentVolumeClaim (a reference to a PersistentVolumeClaim in the same namespace)
    ClaimName:  deepwiki-data-new
    ReadOnly:   false
  kube-api-access-g4mkm:
    Type:                    Projected (a volume that contains injected data from multiple sources)
    TokenExpirationSeconds:  3607
    ConfigMapName:           kube-root-ca.crt
    Optional:                false
    DownwardAPI:             true
QoS Class:                   Burstable
Node-Selectors:              <none>
Tolerations:                 node.kubernetes.io/not-ready:NoExecute op=Exists for 300s
                             node.kubernetes.io/unreachable:NoExecute op=Exists for 300s
Events:                      <none>
```

## Container Information
```
deepwiki
```

## Service Information
```
deepwiki-api        ClusterIP   10.109.30.148   <none>        8001/TCP          3d19h
deepwiki-fixed      ClusterIP   10.109.18.128   <none>        8001/TCP,80/TCP   45h
deepwiki-frontend   ClusterIP   10.109.19.7     <none>        80/TCP            3d19h
```
