import { NextRequest, NextResponse } from 'next/server';
import { pullAndStartDatabase, checkDockerAvailable } from '@/lib/docker-manager';
import { DatabaseType, VALID_DATABASE_TYPES } from '@/constants/database-types';
import { getCurrentUser } from '@/lib/auth';

// POST /api/docker/provision - DISABLED (Use direct database connections instead)
export async function POST(request: NextRequest) {
    return NextResponse.json({
        error: 'Docker provisioning is disabled. Please use direct database connections instead.',
        message: 'Add your database connections manually using the connection details from your database provider (Railway, AWS, etc.).',
        disabled: true
    }, { status: 503 });
}

// Helper to generate connection strings
function getConnectionString(db: any): string {
    const { type, username, password, port, database } = db;
    // In Docker, 'localhost' refers to the container itself. 
    // We need to connect to the host machine where the database containers are mapped.
    const host = process.env.DB_CONNECTION_HOST || 'localhost';

    switch (type) {
        case 'postgres':
        case 'timescaledb':
        case 'edb':
        case 'cloudberry':
        case 'greengage':
        case 'kingbase':
        case 'gaussdb':
        case 'yellowbrick':
        case 'yugabyte':
        case 'cockroachdb':
        case 'greenplum':
        case 'materialize':
            return `postgresql://${username}:${password}@${host}:${port}/${database}`;

        case 'mysql':
        case 'mariadb':
        case 'tidb':
        case 'singlestore':
        case 'gbase':
        case 'oceanbase':
            return `mysql://${username}:${password}@${host}:${port}/${database}`;

        case 'mongodb':
        case 'documentdb':
        case 'ferretdb':
            return `mongodb://${username}:${password}@${host}:${port}/${database}?authSource=admin`;

        case 'redis':
            return `redis://default:${password}@${host}:${port}`;

        case 'mssql':
        case 'azuresql':
        case 'babelfish':
            return `mssql://sa:${password}@${host}:${port}`;

        case 'oracle':
        case 'adw':
        case 'atp':
        case 'ajd':
            return `oracle://${username}:${password}@${host}:${port}/XEPDB1`;

        case 'db2':
        case 'netezza':
            return `db2://${username}:${password}@${host}:${port}/${database}`;

        case 'cassandra':
        case 'scylladb':
        case 'keyspaces':
            return `cassandra://${host}:${port}`;

        case 'elasticsearch':
        case 'opensearch':
        case 'opensearchdistro':
        case 'solr':
            return `http://${username}:${password}@${host}:${port}`;

        case 'influxdb':
        case 'machbase':
        case 'tdengine':
            return `http://${username}:${password}@${host}:${port}`;

        case 'neo4j':
            return `neo4j://${username}:${password}@${host}:${port}`;

        case 'clickhouse':
        case 'starrocks':
        case 'duckdb':
        case 'trino':
        case 'prestodb':
        case 'monetdb':
        case 'cratedb':
        case 'heavydb':
            return `http://${username}:${password}@${host}:${port}`;

        case 'sqlite':
        case 'h2':
        case 'derby':
        case 'hsqldb':
        case 'libsql':
        case 'firebird':
        case 'cubrid':
            return `jdbc:${type}:@${host}:${port}/${database}`;

        case 'couchbase':
        case 'couchdb':
            return `http://${username}:${password}@${host}:${port}`;

        case 'orientdb':
            return `remote:${host}:${port}/${database}`;

        case 'rabbitmq':
            return `amqp://${username}:${password}@${host}:${port}`;

        case 'minio':
            return `http://${username}:${password}@${host}:${port}`;

        case 'surrealdb':
            return `http://${username}:${password}@${host}:${port}`;

        case 'snowflake':
        case 'bigquery':
            return `https://${username}:${password}@${host}:${port}/${database}`;

        case 'dynamodb':
            return `http://${host}:${port}`;

        default:
            return `${type}://${username}:${password}@${host}:${port}/${database}`;
    }
}
