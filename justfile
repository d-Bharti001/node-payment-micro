namespace := "node-payment-micro"

# Ensure `minikube start` first, and `minikube addons enable ingress`
# if not already enabled.
#
# After the services are up, run `minikube tunnel` in a separate tab
# to reach the Ingress from the host.

create-namespace:
    kubectl apply -f manifests/namespace.yaml

# --- Infrastructure (no dependencies on app services) ---

start-kafka:
    kubectl apply -n {{namespace}} -f kafka/manifests/
    kubectl rollout status statefulset/kafka -n {{namespace}} --timeout=120s

start-mailpit:
    kubectl apply -n {{namespace}} -f email_mailpit/manifests/
    kubectl rollout status deployment/mailpit -n {{namespace}} --timeout=60s

# --- MySQL StatefulSets ---

start-auth-mysql:
    kubectl apply -n {{namespace}} -f auth_mysql/manifests/
    kubectl rollout status statefulset/auth-mysql -n {{namespace}} --timeout=120s

start-money-movement-mysql:
    kubectl apply -n {{namespace}} -f money_movement_mysql/manifests/
    kubectl rollout status statefulset/money-movement-mysql -n {{namespace}} --timeout=120s

start-ledger-mysql:
    kubectl apply -n {{namespace}} -f ledger_mysql/manifests/
    kubectl rollout status statefulset/ledger-mysql -n {{namespace}} --timeout=120s

# --- Auth service: config/secret -> migrate -> seed -> deploy ---

start-auth:
    kubectl apply -n {{namespace}} -f auth/manifests/configmap.yaml -f auth/manifests/secret.yaml
    kubectl apply -n {{namespace}} -f auth/manifests/database-migrate.yaml
    kubectl wait -n {{namespace}} --for=condition=complete job/auth-migrate-init --timeout=60s
    kubectl apply -n {{namespace}} -f auth/manifests/database-seed.yaml
    kubectl wait -n {{namespace}} --for=condition=complete job/auth-migrate-seed --timeout=60s
    kubectl apply -n {{namespace}} -f auth/manifests/deployment.yaml -f auth/manifests/service.yaml
    kubectl rollout status deployment/auth -n {{namespace}} --timeout=60s

# --- Money Movement service: config -> migrate -> seed -> deploy (+ outbox relay) ---

start-money-movement:
    kubectl apply -n {{namespace}} -f money_movement/manifests/configmap.yaml
    kubectl apply -n {{namespace}} -f money_movement/manifests/database-migrate.yaml
    kubectl wait -n {{namespace}} --for=condition=complete job/money-movement-migrate-init --timeout=60s
    kubectl apply -n {{namespace}} -f money_movement/manifests/database-seed.yaml
    kubectl wait -n {{namespace}} --for=condition=complete job/money-movement-migrate-seed --timeout=60s
    kubectl apply -n {{namespace}} -f money_movement/manifests/deployment.yaml -f money_movement/manifests/service.yaml -f money_movement/manifests/outbox-relay-deployment.yaml
    kubectl rollout status deployment/money-movement -n {{namespace}} --timeout=60s
    kubectl rollout status deployment/money-movement-outbox-relay -n {{namespace}} --timeout=60s

# --- Ledger service: config -> migrate -> deploy (no seed) ---

start-ledger:
    kubectl apply -n {{namespace}} -f ledger/manifests/configmap.yaml
    kubectl apply -n {{namespace}} -f ledger/manifests/database-migrate.yaml
    kubectl wait -n {{namespace}} --for=condition=complete job/ledger-migrate-init --timeout=60s
    kubectl apply -n {{namespace}} -f ledger/manifests/deployment.yaml
    kubectl rollout status deployment/ledger -n {{namespace}} --timeout=60s

# --- Email service: needs kafka + mailpit already up ---

start-email:
    kubectl apply -n {{namespace}} -f email/manifests/
    kubectl rollout status deployment/email -n {{namespace}} --timeout=60s

# --- API Gateway: needs auth + money-movement already up ---

start-api-gateway:
    kubectl apply -n {{namespace}} -f api_gateway/manifests/
    kubectl rollout status deployment/api-gateway -n {{namespace}} --timeout=60s

# Full deployment, in dependency order
start-services: create-namespace start-kafka start-mailpit start-auth-mysql start-money-movement-mysql start-ledger-mysql start-auth start-money-movement start-ledger start-email start-api-gateway

# Tear down in reverse dependency order
stop-services:
    kubectl delete -n {{namespace}} -f api_gateway/manifests/ --ignore-not-found
    kubectl delete -n {{namespace}} -f email/manifests/ --ignore-not-found
    kubectl delete -n {{namespace}} -f ledger/manifests/ --ignore-not-found
    kubectl delete -n {{namespace}} -f money_movement/manifests/ --ignore-not-found
    kubectl delete -n {{namespace}} -f auth/manifests/ --ignore-not-found
    kubectl delete -n {{namespace}} -f ledger_mysql/manifests/ --ignore-not-found
    kubectl delete -n {{namespace}} -f money_movement_mysql/manifests/ --ignore-not-found
    kubectl delete -n {{namespace}} -f auth_mysql/manifests/ --ignore-not-found
    kubectl delete -n {{namespace}} -f email_mailpit/manifests/ --ignore-not-found
    kubectl delete -n {{namespace}} -f kafka/manifests/ --ignore-not-found

# --- Ad-hoc access for local inspection ---

# Open a MySQL shell against the auth DB (uses the container's own
# MYSQL_USER/MYSQL_PASSWORD/MYSQL_DATABASE env vars, already set via
# envFrom - no credentials touch this justfile or your shell history)
db-auth:
    kubectl exec -it -n {{namespace}} auth-mysql-0 -- sh -c 'mysql -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" $MYSQL_DATABASE'

# Open a MySQL shell against the money_movement DB
db-money-movement:
    kubectl exec -it -n {{namespace}} money-movement-mysql-0 -- sh -c 'mysql -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" $MYSQL_DATABASE'

# Open a MySQL shell against the ledger DB
db-ledger:
    kubectl exec -it -n {{namespace}} ledger-mysql-0 -- sh -c 'mysql -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" $MYSQL_DATABASE'

# Port-forward Mailpit's web UI to http://localhost:8025 (blocks - run in
# its own terminal tab)
mailpit-dashboard:
    kubectl port-forward -n {{namespace}} svc/mailpit-service 8025:8025

# Tail logs for a service by its `app` label, e.g. `just logs ledger`
# (prefixes each line with its pod name, since some services run multiple replicas)
logs service:
    kubectl logs -n {{namespace}} -l app={{service}} --prefix -f
