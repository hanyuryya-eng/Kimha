import json, pathlib
root=pathlib.Path(__file__).resolve().parent.parent
uid=lambda group,i:f'{group:08d}-0000-4000-8000-{i:012d}'
artists=[{'id':uid(1,i+1),'name':n,'aliases':[e], 'bio':'지음의 사용 흐름을 보여 주기 위한 가상의 아티스트입니다.','is_demo':True} for i,(n,e) in enumerate([('오월의 숲','May Forest'),('블루 아워','Blue Hour'),('한결','Hangyeol'),('서울 위성','Seoul Satellite'),('윤슬','Yunseul'),('페이퍼 문','Paper Moon')])]
names=[('아주 느린 밤','A Very Slow Night','인디 록'),('파도가 남긴 말','Words of Waves','드림 팝'),('우리가 머문 계절','Our Season','포크'),('불빛의 궤도','Orbit of Lights','얼터너티브'),('비가 그친 자리','After Rain','인디 팝'),('먼 곳의 편지','Distant Letter','팝'),('작은 우주','Little Universe','인디 록'),('새벽의 온도','Dawn Temperature','드림 팝'),('괜찮은 하루','A Fine Day','포크'),('도시의 뒷면','Behind the City','얼터너티브'),('여름의 조각','Summer Pieces','인디 팝'),('달의 산책','Moon Walk','팝')]
tracks=[{'id':uid(2,i+1),'artist_id':artists[i%6]['id'],'album_id':None,'title':t,'aliases':[e, t.replace(' ','')],'version':'original','released_year':2025+(i%2),'genre':g,'description':f'{t}. 하루의 끝에서 잠시 멈춰 서고 싶을 때 떠올릴 법한 음악을 상상하며 만든 예시입니다. 실제 발매된 음원이 아닌 지음 데모 데이터입니다.','cover_index':i,'source_url':None,'visibility':'public','is_demo':True} for i,(t,e,g) in enumerate(names)]
profiles=[{'id':uid(3,i+1),'username':n,'nickname':k,'bio':b,'genres':['인디 록','드림 팝'],'role':'member'} for i,(n,k,b) in enumerate([('slow_listener','느린 리스너','같은 노래를 조금씩 다르게 듣습니다.'),('night_record','밤의 기록','음악과 오래 머물고 싶은 순간들.'),('wave_collector','파도 수집가','작은 소리를 모으고 있어요.')])]
notes=[{'id':uid(4,i+1),'track_id':tracks[i]['id'],'user_id':profiles[i%3]['id'],'body':b,'kind':'impression','visibility':'public','created_at':'2026-10-29T12:00:00+09:00','updated_at':'2026-10-29T12:00:00+09:00','is_demo':True} for i,b in enumerate(['이어폰을 잠시 빼니 바람 소리가 들렸다. 오늘의 끝은 이런 노래와 어울릴 것 같았다. 실제 감상이 아닌 데모 기록입니다.','어떤 음악은 목적지보다 돌아가는 길을 떠올리게 한다. 길었던 하루를 천천히 접는 마음으로. 데모 기록입니다.','이 계절을 나중에는 어떤 소리로 기억하게 될까. 잊고 싶지 않은 순간을 여기에 남겨 둔다. 데모 기록입니다.'])]
stories=[{'id':uid(5,i+1),'track_id':tracks[i]['id'],'title':t,'body':b,'source_url':None,'author_id':profiles[0]['id'],'is_demo':True,'visibility':'public','created_at':'2026-10-29T00:00:00Z'} for i,(t,b) in enumerate([('소리에 귀 기울이는 또 다른 방법','반복되는 소리를 들으며 자신만의 장면을 떠올려 보세요. 이 글은 기능을 소개하는 독자적 예시이며 실제 곡에 관한 사실 설명이 아닙니다.'),('한 곡에서 시작하는 작은 기록','정답을 찾기보다 내게 남은 감각을 한 줄로 적어 보세요. 이 글은 데모 해설입니다.'),('음악을 오래 간직하는 법','곡, 기억, 플레이리스트를 연결하면 나만의 음악 지도가 생깁니다. 데모 안내입니다.')])]
concerts=[{'id':uid(6,1),'title':'느린 숲 페스티벌','venue':'서울 · 가상의 숲 스테이지','starts_at':'2027-05-22T06:00:00Z','description':'봄의 끝, 우리가 좋아하는 음악을 더 가까이. 실제 개최되지 않는 데모 공연입니다.','is_demo':True}]
playlists=[{'id':uid(7,1),'user_id':profiles[0]['id'],'name':'밤의 드라이브','description':'불빛이 흐르는 길 위에서 · 데모 플레이리스트','visibility':'public','created_at':'2026-10-29T00:00:00Z'}]
data=dict(artists=artists,tracks=tracks,profiles=profiles,notes=notes,stories=stories,concerts=concerts,playlists=playlists)
(root/'src/lib/data/demo.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
# Seed only catalog data. Auth identities are created through Auth in integration tests.
def literal(x):
 if x is None:return 'null'
 if isinstance(x,bool):return 'true' if x else 'false'
 if isinstance(x,int):return str(x)
 if isinstance(x,list):return 'array['+','.join(literal(v) for v in x)+']::text[]'
 return "'"+str(x).replace("'","''")+"'"
lines=['-- All seeded artists/tracks/stories/concerts are fictional demo data. No lyrics or recordings.']
for table, rows in [('artists',artists),('tracks',tracks),('concerts',concerts),('music_stories',[{**s,'author_id':None} for s in stories])]:
 for row in rows:lines.append(f"insert into public.{table} ({','.join(row)}) values ({','.join(literal(v) for v in row.values())}) on conflict do nothing;")
for t in tracks[:6]:
 lines.append(f"insert into public.concert_tracks(concert_id,track_id,list_type) values ('{concerts[0]['id']}','{t['id']}','fan_pick') on conflict do nothing;")
for a in artists:
 lines.append(f"insert into public.concert_artists(concert_id,artist_id) values ('{concerts[0]['id']}','{a['id']}') on conflict do nothing;")
(root/'supabase/seed.sql').write_text('\n'.join(lines)+'\n')
colors=[('#bc562c','#edb879'),('#286765','#9fc8b9'),('#686072','#d1c5b0'),('#3b5590','#a7b6d2'),('#9d7348','#dec28f'),('#653c53','#c79da6'),('#4e6c4d','#a5ba89'),('#596d85','#c7cbd1'),('#b4655b','#e2b5a4'),('#4b484a','#b6a693'),('#998c4f','#e7d6a3'),('#655b9c','#c2bbe1')]
for i,(c,d) in enumerate(colors):
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="{c}"/><circle cx="200" cy="200" r="{95+i%3*13}" fill="none" stroke="{d}" stroke-width="1"/><circle cx="200" cy="200" r="60" fill="none" stroke="{d}" stroke-width="1"/><circle cx="200" cy="200" r="6" fill="{d}"/><path d="M0 {280-i*9} Q200 {110+i*9} 400 {280-i*9}" fill="none" stroke="{d}" stroke-width="2"/><text x="30" y="48" font-family="sans-serif" font-size="12" letter-spacing="4" fill="{d}">JI–EUM ARCHIVE</text><text x="30" y="365" font-family="sans-serif" font-size="11" letter-spacing="3" fill="{d}">DEMO RECORD / {i+1:02}</text></svg>'''
 (root/f'public/covers/{i}.svg').write_text(svg)
